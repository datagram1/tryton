import { useState, useEffect } from 'react';
import { Modal, Form, Button, Tabs, Tab, Alert, Spinner } from 'react-bootstrap';
import { FiSave, FiX } from 'react-icons/fi';
import usePreferencesStore from '../store/preferences';
import useSessionStore from '../store/session';

/**
 * PreferencesWindow Component
 * Modal window for managing user preferences
 */
function PreferencesWindow({ show, onHide }) {
  const { userId, sessionId, database } = useSessionStore();
  const {
    language,
    dateFormat,
    timeFormat,
    numberFormat,
    thousandsSeparator,
    locale,
    theme,
    customColors,
    isLoading,
    error,
    savePreferences,
    updatePreferences,
    setTheme,
    updateColors,
    clearError,
  } = usePreferencesStore();

  // Local form state
  const [formData, setFormData] = useState({
    language: language,
    dateFormat: dateFormat,
    timeFormat: timeFormat,
    numberFormat: numberFormat,
    thousandsSeparator: thousandsSeparator,
    locale: locale,
    theme: theme,
  });

  const [colorData, setColorData] = useState({ ...customColors });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Update form when preferences change
  useEffect(() => {
    setFormData({
      language,
      dateFormat,
      timeFormat,
      numberFormat,
      thousandsSeparator,
      locale,
      theme,
    });
    setColorData({ ...customColors });
  }, [language, dateFormat, timeFormat, numberFormat, thousandsSeparator, locale, theme, customColors]);

  // Clear error when modal closes
  useEffect(() => {
    if (!show) {
      clearError();
      setSaveSuccess(false);
    }
  }, [show, clearError]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleColorChange = (colorName, value) => {
    setColorData((prev) => ({ ...prev, [colorName]: value }));
  };

  const handleSave = async () => {
    setSaveSuccess(false);

    // Update local preferences immediately
    updatePreferences(formData);
    setTheme(formData.theme);
    updateColors(colorData);

    // Save to server (language and locale)
    const serverPreferences = {
      language: formData.language,
      locale: formData.locale,
    };

    const success = await savePreferences(serverPreferences, userId, sessionId, database);

    if (success) {
      setSaveSuccess(true);
      setTimeout(() => {
        onHide();
      }, 1500);
    }
  };

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'it', label: 'Italiano' },
    { value: 'pt', label: 'Português' },
    { value: 'nl', label: 'Nederlands' },
    { value: 'ru', label: 'Русский' },
    { value: 'zh', label: '中文' },
    { value: 'ja', label: '日本語' },
  ];

  const dateFormatOptions = [
    { value: '%Y-%m-%d', label: 'YYYY-MM-DD (2024-01-31)' },
    { value: '%d/%m/%Y', label: 'DD/MM/YYYY (31/01/2024)' },
    { value: '%m/%d/%Y', label: 'MM/DD/YYYY (01/31/2024)' },
    { value: '%d.%m.%Y', label: 'DD.MM.YYYY (31.01.2024)' },
    { value: '%B %d, %Y', label: 'Month DD, YYYY (January 31, 2024)' },
  ];

  const timeFormatOptions = [
    { value: '%H:%M:%S', label: '24-hour (23:59:59)' },
    { value: '%I:%M:%S %p', label: '12-hour (11:59:59 PM)' },
    { value: '%H:%M', label: '24-hour short (23:59)' },
    { value: '%I:%M %p', label: '12-hour short (11:59 PM)' },
  ];

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>User Preferences</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={clearError}>
            {error}
          </Alert>
        )}

        {saveSuccess && (
          <Alert variant="success">
            Preferences saved successfully!
          </Alert>
        )}

        <Tabs defaultActiveKey="general" className="mb-3">
          {/* General Settings Tab */}
          <Tab eventKey="general" title="General">
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Language</Form.Label>
                <Form.Select
                  value={formData.language}
                  onChange={(e) => handleChange('language', e.target.value)}
                >
                  {languageOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Select your preferred language for the interface
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Locale</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.locale}
                  onChange={(e) => handleChange('locale', e.target.value)}
                  placeholder="en_US"
                />
                <Form.Text className="text-muted">
                  Locale for regional formatting (e.g., en_US, fr_FR, de_DE)
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Date Format</Form.Label>
                <Form.Select
                  value={formData.dateFormat}
                  onChange={(e) => handleChange('dateFormat', e.target.value)}
                >
                  {dateFormatOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Choose how dates are displayed
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Time Format</Form.Label>
                <Form.Select
                  value={formData.timeFormat}
                  onChange={(e) => handleChange('timeFormat', e.target.value)}
                >
                  {timeFormatOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Choose how times are displayed
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Number Decimal Separator</Form.Label>
                <Form.Select
                  value={formData.numberFormat}
                  onChange={(e) => handleChange('numberFormat', e.target.value)}
                >
                  <option value=".">Period (123.45)</option>
                  <option value=",">Comma (123,45)</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Thousands Separator</Form.Label>
                <Form.Select
                  value={formData.thousandsSeparator}
                  onChange={(e) => handleChange('thousandsSeparator', e.target.value)}
                >
                  <option value=",">Comma (1,000)</option>
                  <option value=".">Period (1.000)</option>
                  <option value=" ">Space (1 000)</option>
                  <option value="">None (1000)</option>
                </Form.Select>
              </Form.Group>
            </Form>
          </Tab>

          {/* Theme Tab */}
          <Tab eventKey="theme" title="Theme">
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Theme</Form.Label>
                <div>
                  <Form.Check
                    type="radio"
                    id="theme-light"
                    label="Light"
                    value="light"
                    checked={formData.theme === 'light'}
                    onChange={(e) => handleChange('theme', e.target.value)}
                    className="mb-2"
                  />
                  <Form.Check
                    type="radio"
                    id="theme-dark"
                    label="Dark"
                    value="dark"
                    checked={formData.theme === 'dark'}
                    onChange={(e) => handleChange('theme', e.target.value)}
                  />
                </div>
                <Form.Text className="text-muted">
                  Select your preferred color theme
                </Form.Text>
              </Form.Group>

              <hr className="my-4" />

              <h6 className="mb-3">Custom Colors</h6>
              <p className="text-muted small mb-3">
                Customize the color scheme (changes are saved locally)
              </p>

              <div className="row">
                {Object.entries(colorData).map(([colorName, colorValue]) => (
                  <div key={colorName} className="col-md-6 mb-3">
                    <Form.Group>
                      <Form.Label className="text-capitalize">{colorName}</Form.Label>
                      <div className="d-flex align-items-center gap-2">
                        <Form.Control
                          type="color"
                          value={colorValue}
                          onChange={(e) => handleColorChange(colorName, e.target.value)}
                          style={{ width: '60px', height: '38px' }}
                        />
                        <Form.Control
                          type="text"
                          value={colorValue}
                          onChange={(e) => handleColorChange(colorName, e.target.value)}
                          placeholder="#000000"
                        />
                      </div>
                    </Form.Group>
                  </div>
                ))}
              </div>
            </Form>
          </Tab>
        </Tabs>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={isLoading}>
          <FiX className="me-2" />
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={isLoading}>
          {isLoading ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Saving...
            </>
          ) : (
            <>
              <FiSave className="me-2" />
              Save Preferences
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default PreferencesWindow;
