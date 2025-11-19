import { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Spinner, Alert, ButtonGroup, Button } from 'react-bootstrap';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, parseISO, isValid } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { parseAndNormalizeView } from '../tryton/parsers/xml';
import rpc from '../api/rpc';
import useSessionStore from '../store/session';
import useTabsStore from '../store/tabs';

// Setup the localizer for react-big-calendar using date-fns
const locales = {
  'en-US': require('date-fns/locale/en-US'),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

/**
 * CalendarView Component
 * Container for displaying Tryton records in a calendar view
 */
function CalendarView({ modelName, viewId = null, domain = [], limit = 1000 }) {
  const { sessionId, database } = useSessionStore();
  const { openTab } = useTabsStore();

  // State
  const [viewDefinition, setViewDefinition] = useState(null);
  const [fields, setFields] = useState({});
  const [records, setRecords] = useState([]);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Calendar attributes from view definition
  const [calendarAttrs, setCalendarAttrs] = useState({
    dtstart: null,
    dtend: null,
    color: null,
    background_color: null,
    editable: true,
  });

  /**
   * Load view definition
   */
  useEffect(() => {
    const loadView = async () => {
      if (!modelName || !sessionId || !database) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        console.log('[CalendarView] Loading view for model:', modelName);

        // Fetch the view definition
        const viewResult = await rpc.fieldsViewGet(
          modelName,
          viewId,
          'calendar',
          sessionId,
          database
        );

        console.log('[CalendarView] View result:', viewResult);

        // Parse the XML architecture
        const parsedView = parseAndNormalizeView(viewResult.arch);
        console.log('[CalendarView] Parsed view:', parsedView);

        setViewDefinition(parsedView);
        setFields(viewResult.fields || {});

        // Extract calendar-specific attributes from the view
        const attrs = {
          dtstart: parsedView.attrs?.dtstart || null,
          dtend: parsedView.attrs?.dtend || null,
          color: parsedView.attrs?.color || null,
          background_color: parsedView.attrs?.background_color || null,
          editable: parsedView.attrs?.editable !== '0',
        };

        console.log('[CalendarView] Calendar attributes:', attrs);
        setCalendarAttrs(attrs);

      } catch (err) {
        console.error('[CalendarView] Error loading view:', err);
        setError(err.message || 'Failed to load calendar view');
      } finally {
        setIsLoading(false);
      }
    };

    loadView();
  }, [modelName, viewId, sessionId, database]);

  /**
   * Load records for the calendar
   */
  const loadRecords = useCallback(async () => {
    if (!modelName || !sessionId || !database || !calendarAttrs.dtstart) {
      return;
    }

    try {
      setIsLoading(true);

      console.log('[CalendarView] Loading records...');

      // Build domain for date range
      const searchDomain = [...domain];

      // Search for records
      const recordData = await rpc.searchRead(
        modelName,
        searchDomain,
        Object.keys(fields),
        0,
        limit,
        null,
        sessionId,
        database
      );

      console.log('[CalendarView] Loaded records:', recordData);
      setRecords(recordData || []);

    } catch (err) {
      console.error('[CalendarView] Error loading records:', err);
      setError(err.message || 'Failed to load calendar data');
    } finally {
      setIsLoading(false);
    }
  }, [modelName, sessionId, database, domain, fields, limit, calendarAttrs.dtstart]);

  /**
   * Load records when view is ready
   */
  useEffect(() => {
    if (calendarAttrs.dtstart && Object.keys(fields).length > 0) {
      loadRecords();
    }
  }, [loadRecords, calendarAttrs.dtstart, fields]);

  /**
   * Convert records to calendar events
   */
  useEffect(() => {
    if (!calendarAttrs.dtstart || records.length === 0) {
      setEvents([]);
      return;
    }

    const calendarEvents = records
      .map((record) => {
        try {
          // Get start and end dates
          const startValue = record[calendarAttrs.dtstart];
          const endValue = calendarAttrs.dtend ? record[calendarAttrs.dtend] : startValue;

          if (!startValue) {
            return null;
          }

          // Parse dates - handle both date and datetime fields
          let start = new Date(startValue);
          let end = endValue ? new Date(endValue) : start;

          // Validate dates
          if (!isValid(start)) {
            console.warn('[CalendarView] Invalid start date for record:', record);
            return null;
          }

          if (!isValid(end)) {
            end = start;
          }

          // Ensure end is after start
          if (end < start) {
            console.warn('[CalendarView] End date before start date for record:', record);
            return null;
          }

          // Get title (use 'name' or 'rec_name' field)
          const title = record.name || record.rec_name || `Record ${record.id}`;

          // Get colors if specified
          let backgroundColor = '#3174ad'; // Default blue
          let textColor = '#ffffff'; // Default white

          if (calendarAttrs.background_color && record[calendarAttrs.background_color]) {
            backgroundColor = record[calendarAttrs.background_color];
          }

          if (calendarAttrs.color && record[calendarAttrs.color]) {
            textColor = record[calendarAttrs.color];
          }

          return {
            id: record.id,
            title,
            start,
            end,
            resource: record,
            allDay: !startValue.includes('T'), // Simple check for date vs datetime
            style: {
              backgroundColor,
              color: textColor,
            },
          };
        } catch (err) {
          console.error('[CalendarView] Error converting record to event:', err, record);
          return null;
        }
      })
      .filter((event) => event !== null);

    console.log('[CalendarView] Converted events:', calendarEvents);
    setEvents(calendarEvents);
  }, [records, calendarAttrs]);

  /**
   * Handle event click - open form view
   */
  const handleSelectEvent = useCallback(
    (event) => {
      console.log('[CalendarView] Event clicked:', event);

      // Open form view for the record
      openTab({
        id: `form-${modelName}-${event.id}-${Date.now()}`,
        title: `${event.title}`,
        type: 'form',
        props: {
          modelName,
          recordId: event.id,
        },
      });
    },
    [modelName, openTab]
  );

  /**
   * Handle selecting a time slot - create new record
   */
  const handleSelectSlot = useCallback(
    ({ start, end }) => {
      if (!calendarAttrs.editable) {
        return;
      }

      console.log('[CalendarView] Slot selected:', { start, end });

      // Open form view for new record with default date
      openTab({
        id: `form-${modelName}-new-${Date.now()}`,
        title: `New ${modelName}`,
        type: 'form',
        props: {
          modelName,
          recordId: null, // null means new record
          // TODO: Pass default values for date fields
        },
      });
    },
    [modelName, openTab, calendarAttrs.editable]
  );

  /**
   * Handle event drag and drop - update record dates
   */
  const handleEventDrop = useCallback(
    async ({ event, start, end }) => {
      if (!calendarAttrs.editable) {
        return;
      }

      console.log('[CalendarView] Event dropped:', { event, start, end });

      try {
        // Update the record with new dates
        const updates = {
          [calendarAttrs.dtstart]: start.toISOString(),
        };

        if (calendarAttrs.dtend) {
          updates[calendarAttrs.dtend] = end.toISOString();
        }

        await rpc.write(
          modelName,
          [event.id],
          updates,
          sessionId,
          database
        );

        // Reload records to reflect changes
        await loadRecords();
      } catch (err) {
        console.error('[CalendarView] Error updating event:', err);
        alert(`Failed to update event: ${err.message}`);
      }
    },
    [modelName, sessionId, database, calendarAttrs, loadRecords]
  );

  /**
   * Handle event resize - update end date
   */
  const handleEventResize = useCallback(
    async ({ event, start, end }) => {
      if (!calendarAttrs.editable || !calendarAttrs.dtend) {
        return;
      }

      console.log('[CalendarView] Event resized:', { event, start, end });

      try {
        // Update the record with new end date
        const updates = {
          [calendarAttrs.dtend]: end.toISOString(),
        };

        await rpc.write(
          modelName,
          [event.id],
          updates,
          sessionId,
          database
        );

        // Reload records to reflect changes
        await loadRecords();
      } catch (err) {
        console.error('[CalendarView] Error resizing event:', err);
        alert(`Failed to resize event: ${err.message}`);
      }
    },
    [modelName, sessionId, database, calendarAttrs, loadRecords]
  );

  /**
   * Custom event style getter for color coding
   */
  const eventStyleGetter = useCallback((event) => {
    return {
      style: event.style || {},
    };
  }, []);

  if (isLoading && events.length === 0) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading calendar...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Calendar</Alert.Heading>
          <p>{error}</p>
        </Alert>
      </Container>
    );
  }

  if (!calendarAttrs.dtstart) {
    return (
      <Container className="mt-4">
        <Alert variant="warning">
          <Alert.Heading>Invalid Calendar View</Alert.Heading>
          <p>Calendar view must define a dtstart attribute.</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="h-100 d-flex flex-column p-3">
      {/* View Selector */}
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          {modelName} Calendar
        </h5>
        <ButtonGroup size="sm">
          <Button
            variant={currentView === 'month' ? 'primary' : 'outline-primary'}
            onClick={() => setCurrentView('month')}
          >
            Month
          </Button>
          <Button
            variant={currentView === 'week' ? 'primary' : 'outline-primary'}
            onClick={() => setCurrentView('week')}
          >
            Week
          </Button>
          <Button
            variant={currentView === 'day' ? 'primary' : 'outline-primary'}
            onClick={() => setCurrentView('day')}
          >
            Day
          </Button>
          <Button
            variant={currentView === 'agenda' ? 'primary' : 'outline-primary'}
            onClick={() => setCurrentView('agenda')}
          >
            Agenda
          </Button>
        </ButtonGroup>
      </div>

      {/* Calendar */}
      <div className="flex-grow-1" style={{ minHeight: '500px' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={currentView}
          onView={setCurrentView}
          date={currentDate}
          onNavigate={setCurrentDate}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          onEventDrop={calendarAttrs.editable ? handleEventDrop : undefined}
          onEventResize={calendarAttrs.editable && calendarAttrs.dtend ? handleEventResize : undefined}
          eventPropGetter={eventStyleGetter}
          selectable={calendarAttrs.editable}
          resizable={calendarAttrs.editable && !!calendarAttrs.dtend}
          popup
          style={{ height: '100%' }}
        />
      </div>

      {/* Status bar */}
      {events.length > 0 && (
        <div className="mt-2 text-muted small">
          Showing {events.length} event{events.length !== 1 ? 's' : ''}
        </div>
      )}
    </Container>
  );
}

export default CalendarView;
