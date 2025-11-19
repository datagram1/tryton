# React UI Feature Parity Tasks - Missing Functionality from jQuery SAO Client

**Goal**: Bring the new React UI (`./web-client-next`) to feature parity with the old jQuery/Bootstrap3 SAO client.

**Status**: Based on comprehensive analysis completed on 2025-11-19

---

## Executive Summary

The current React UI has implemented:
- ✅ Basic CRUD operations (Create, Read, Update, Delete)
- ✅ Form and List views
- ✅ 11 basic field widgets
- ✅ Authentication & session management
- ✅ Tab-based MDI interface
- ✅ Menu navigation system
- ✅ Basic validation (5-step bridge)
- ✅ Many2One autocomplete
- ✅ One2Many/Many2Many grids (read-only)

The old jQuery UI has **31 widget types**, **7 view types**, and **extensive features** across 19,000+ lines of code.

**Gap Analysis**: ~85% of features still need to be implemented

---

## CATEGORY 1: FIELD WIDGETS (Missing 20+ widget types)

### Priority: HIGH

Currently implemented: char, integer, float, boolean, date, datetime, selection, many2one, one2many, many2many, label

### Missing Basic Widgets

- [x] **1.1 Password Widget** ✅ COMPLETED
  - File: `src/tryton/registry/widgets/PasswordWidget.jsx`
  - Password input with masking
  - Show/hide password toggle
  - Reference: `/home/user/tryton/sao/src/view/form.js` (password field)

- [x] **1.2 Color Widget** ✅ COMPLETED
  - File: `src/tryton/registry/widgets/ColorWidget.jsx`
  - Color picker input
  - Color preview swatch
  - Hex color validation
  - Reference: `/home/user/tryton/sao/src/view/form.js` (color field)

- [x] **1.3 Text Widget (Multi-line)** ✅ COMPLETED
  - File: Update `src/tryton/registry/widgets/CharWidget.jsx` to support text type
  - Multi-line textarea
  - Auto-resize option
  - Max-length indicator
  - Reference: `/home/user/tryton/sao/src/view/form.js` (text field)

- [ ] **1.4 RichText Widget**
  - File: `src/tryton/registry/widgets/RichTextWidget.jsx`
  - WYSIWYG HTML editor
  - Toolbar with formatting options (bold, italic, lists, links)
  - Consider: TinyMCE, CKEditor, or Quill.js
  - Reference: `/home/user/tryton/sao/src/view/form.js` (richtext field)

- [x] **1.5 Time Widget** ✅ COMPLETED
  - File: `src/tryton/registry/widgets/TimeWidget.jsx`
  - Time picker (HH:MM:SS format)
  - Time format validation
  - Reference: `/home/user/tryton/sao/src/view/form.js` (time field)

- [x] **1.6 TimeDelta Widget** ✅ COMPLETED
  - File: `src/tryton/registry/widgets/TimeDeltaWidget.jsx`
  - Duration/time difference input
  - Format: days, hours, minutes, seconds
  - Converter display (e.g., "2h 30m")
  - Reference: `/home/user/tryton/sao/src/view/form.js` (timedelta field)

- [x] **1.7 Numeric Widget** ✅ COMPLETED
  - File: `src/tryton/registry/widgets/NumericWidget.jsx`
  - Arbitrary precision decimal input
  - Scientific notation support
  - Reference: `/home/user/tryton/sao/src/view/form.js` (numeric field)

- [x] **1.8 MultiSelection Widget** ✅ COMPLETED
  - File: `src/tryton/registry/widgets/MultiSelectionWidget.jsx`
  - Multiple selection with dropdown
  - Tag display for selected items with remove button
  - Remove tag functionality
  - Reference: `/home/user/tryton/sao/src/view/form.js` (multiselection field)

### Missing Relational Widgets

- [x] **1.9 Reference Widget** ✅ COMPLETED
  - File: `src/tryton/registry/widgets/ReferenceWidget.jsx`
  - Dynamic model reference field
  - Model selector dropdown + Many2One autocomplete combo
  - Format: "model.name,123"
  - Reference: `/home/user/tryton/sao/src/view/form.js` (reference field)

- [x] **1.10 One2One Widget** ✅ COMPLETED
  - File: `src/tryton/registry/widgets/One2OneWidget.jsx`
  - Similar to Many2One but for one-to-one relationships
  - Single record selection
  - Reference: `/home/user/tryton/sao/src/view/form.js` (one2one field)

### Missing Binary/Media Widgets

- [x] **1.11 Binary Widget** ✅ COMPLETED
  - File: `src/tryton/registry/widgets/BinaryWidget.jsx`
  - File upload with drag & drop
  - File download button
  - File size display
  - Progress indicator
  - Reference: `/home/user/tryton/sao/src/view/form.js` (binary field)

- [x] **1.12 Image Widget** ✅ COMPLETED
  - File: `src/tryton/registry/widgets/ImageWidget.jsx`
  - Image upload/display
  - Image preview/thumbnail
  - Drag & drop support
  - Image size limits and validation
  - Reference: `/home/user/tryton/sao/src/view/form.js` (image field)

- [x] **1.13 Document Widget** ✅ COMPLETED
  - File: `src/tryton/registry/widgets/DocumentWidget.jsx`
  - Document display/upload
  - PDF preview (iframe-based for PDFs)
  - Document type icons (PDF, Word, Excel, PowerPoint, images, archives, etc.)
  - Drag & drop support
  - File size display
  - Reference: `/home/user/tryton/sao/src/view/form.js` (document field)

### Missing Link Widgets

- [x] **1.14 URL Widget** ✅ COMPLETED
  - File: `src/tryton/registry/widgets/URLWidget.jsx`
  - URL display as clickable link
  - Open in new tab
  - URL validation
  - Reference: `/home/user/tryton/sao/src/view/form.js` (url field)

- [x] **1.15 Email Widget** ✅ COMPLETED
  - File: `src/tryton/registry/widgets/EmailWidget.jsx`
  - Email display as mailto: link
  - Email validation
  - Reference: `/home/user/tryton/sao/src/view/form.js` (email field)

- [x] **1.16 CallTo Widget** ✅ COMPLETED
  - File: `src/tryton/registry/widgets/CallToWidget.jsx`
  - Phone number as tel: link
  - Phone number formatting
  - Reference: `/home/user/tryton/sao/src/view/form.js` (callto field)

- [ ] **1.17 SIP Widget**
  - File: `src/tryton/registry/widgets/SIPWidget.jsx`
  - SIP protocol link
  - SIP address validation
  - Reference: `/home/user/tryton/sao/src/view/form.js` (sip field)

### Missing Special Widgets

- [x] **1.18 HTML Widget** ✅ COMPLETED
  - File: `src/tryton/registry/widgets/HTMLWidget.jsx`
  - HTML content display (read-only)
  - Basic HTML sanitization (strips scripts and event handlers)
  - Security: XSS protection (Note: Consider installing DOMPurify for production)
  - Reference: `/home/user/tryton/sao/src/view/form.js` (html field)

- [x] **1.19 ProgressBar Widget** ✅ COMPLETED
  - File: `src/tryton/registry/widgets/ProgressBarWidget.jsx`
  - Progress bar display (read-only)
  - Percentage or value display
  - Color coding based on value (danger/warning/primary/info/success)
  - Reference: `/home/user/tryton/sao/src/view/form.js` (progressbar field)

- [ ] **1.20 Dict Widget**
  - File: `src/tryton/registry/widgets/DictWidget.jsx`
  - Key-value pair editor
  - Add/remove entries
  - Schema validation support
  - JSON display/edit
  - Reference: `/home/user/tryton/sao/src/view/form.js` (dict field)

- [ ] **1.21 PYSON Widget**
  - File: `src/tryton/registry/widgets/PYSONWidget.jsx`
  - PYSON expression editor
  - Syntax validation
  - Pretty print
  - Reference: `/home/user/tryton/sao/src/view/form.js` (pyson field)

---

## CATEGORY 2: VIEW TYPES ✅ ALL COMPLETED

### Priority: HIGH

Currently implemented: Form, List (Tree), Calendar, Graph, Board (basic), List-Form, Gantt (placeholder)

### Completed Views

- [x] **2.1 Calendar View** ✅ COMPLETED
  - File: `src/components/CalendarView.jsx`
  - Month/Week/Day/Agenda view switching ✅
  - Event rendering from records ✅
  - Drag & drop events to reschedule ✅
  - Event resize to change duration ✅
  - Click to create events ✅
  - Color coding by field (background_color and color attributes) ✅
  - Integration: react-big-calendar ✅
  - Registered in TabManager and MainLayout ✅
  - Reference: `/home/user/tryton/sao/src/view/calendar.js`

- [x] **2.2 Graph/Chart View** ✅ COMPLETED
  - File: `src/components/GraphView.jsx`
  - Chart types: bar (vertical/horizontal), line, pie ✅
  - Interactive tooltips ✅
  - Click to drill down (opens filtered list view) ✅
  - Data aggregation (grouping and summing) ✅
  - Chart type switching ✅
  - Integration: Recharts ✅
  - Registered in TabManager and MainLayout ✅
  - Reference: `/home/user/tryton/sao/src/view/graph.js`

- [x] **2.3 Board/Dashboard View** ✅ COMPLETED (Basic Implementation)
  - File: `src/components/BoardView.jsx`
  - Grid layout with multiple action panels ✅
  - Parse board view definition ✅
  - Display action widgets in grid ✅
  - Registered in TabManager and MainLayout ✅
  - Note: Full implementation requires embedded action execution system
  - Reference: `/home/user/tryton/sao/src/board.js`

- [x] **2.4 List-Form View** ✅ COMPLETED
  - File: `src/components/ListFormView.jsx`
  - Mobile-friendly list + form combination ✅
  - Responsive card layout ✅
  - Click card to open form view ✅
  - Field value rendering ✅
  - Registered in TabManager and MainLayout ✅
  - Reference: `/home/user/tryton/sao/src/view/list_form.js`

- [x] **2.5 Gantt View** ✅ COMPLETED (Placeholder Implementation)
  - File: `src/components/GanttView.jsx`
  - View definition parsing ✅
  - Record loading ✅
  - Registered in TabManager and MainLayout ✅
  - Note: Full timeline visualization requires specialized Gantt library
  - Recommended: frappe-gantt, @bryntum/gantt, or gantt-schedule-timeline-calendar

---

## CATEGORY 3: TOOLBAR ACTIONS (Missing 15+ actions)

### Priority: CRITICAL

Currently implemented: Save, Cancel, New (in FormView only)

### Missing Core Actions

- [x] **3.1 Delete Button** ✅ COMPLETED
  - Location: `src/components/FormToolbar.jsx`
  - Delete current record with confirmation dialog
  - Keyboard shortcut: Ctrl+D
  - RPC: `delete` method
  - Handle delete errors gracefully

- [x] **3.2 Duplicate Button** ✅ COMPLETED
  - Location: `src/components/FormToolbar.jsx`
  - Copy current record
  - Keyboard shortcut: Ctrl+Shift+D
  - RPC: `copy` method
  - Open duplicated record in new tab or same view

- [x] **3.3 Previous/Next Navigation** ✅ COMPLETED
  - Location: `src/components/FormToolbar.jsx`
  - Navigate between records in current list
  - Keyboard shortcuts: Ctrl+Up (previous), Ctrl+Down (next)
  - Update form data without closing tab
  - Maintain position in list

- [x] **3.4 Reload/Undo Button** ✅ COMPLETED
  - Location: `src/components/FormToolbar.jsx`
  - Reload record from server (undo unsaved changes)
  - Keyboard shortcut: Ctrl+R
  - Confirmation if dirty

- [x] **3.5 Switch View Button** ✅ COMPLETED
  - Location: `src/components/FormToolbar.jsx`
  - Switch between form/list views
  - Keyboard shortcut: Ctrl+L
  - Maintain record selection when switching

### Missing Advanced Actions

- [x] **3.6 Attachment Manager** ✅ COMPLETED
  - File: `src/windows/AttachmentWindow.jsx`
  - Button in toolbar (Ctrl+Shift+T)
  - List all attachments on record
  - Upload/download/delete attachments
  - Drag & drop file upload
  - Preview panel (file type icons)
  - Attachment count badge on button
  - Reference: `/home/user/tryton/sao/src/window.js` (Attachment class)

- [x] **3.7 Note System** ✅ COMPLETED
  - File: `src/windows/NoteWindow.jsx`
  - Button in toolbar (Ctrl+Shift+N)
  - Add/edit/delete notes on record
  - Mark notes as read/unread
  - Unread/total count badges (secondary + danger)
  - Note timestamp and user tracking
  - Inline note editor with save/cancel
  - Reference: `/home/user/tryton/sao/src/window.js` (Note class)

- [ ] **3.8 Chat/Comments**
  - File: `src/components/ChatWidget.jsx`
  - Button in toolbar
  - Real-time chat on record
  - Message history
  - Reference: `/home/user/tryton/sao/src/window.js`

- [ ] **3.9 Action Menu**
  - File: `src/components/ActionMenu.jsx`
  - Button in toolbar (Ctrl+E)
  - Execute server-defined actions on record
  - Action dropdown list
  - Reference: `/home/user/tryton/sao/src/action.js`

- [ ] **3.10 Related Records**
  - File: `src/windows/RelateWindow.jsx`
  - Button in toolbar (Ctrl+Shift+R)
  - Show related records from other models
  - Navigate to related data
  - Reference: `/home/user/tryton/sao/src/window.js`

- [ ] **3.11 Print/Report Generation**
  - File: `src/windows/ReportWindow.jsx`
  - Button in toolbar (Ctrl+P)
  - List available reports
  - Generate PDF reports
  - Download/print/email reports
  - Direct print option
  - Reference: `/home/user/tryton/sao/src/action.js` (Report class)

- [ ] **3.12 Email Integration**
  - File: `src/windows/EmailWindow.jsx`
  - Button in toolbar (Ctrl+Shift+E)
  - Compose email from record context
  - To/CC/BCC fields
  - Subject and body
  - Attachment selection
  - Email templates
  - Reference: `/home/user/tryton/sao/src/window.js` (Email class)

- [ ] **3.13 Export Data**
  - File: `src/windows/ExportWindow.jsx`
  - Button in toolbar
  - Export current view data to CSV
  - Field selection
  - Export all or listed records
  - Saved export configurations
  - Reference: `/home/user/tryton/sao/src/window.js` (Export class)

- [ ] **3.14 Import Data**
  - File: `src/windows/ImportWindow.jsx`
  - Button in toolbar
  - Import CSV data
  - Field mapping
  - Preview and validation
  - Reference: `/home/user/tryton/sao/src/window.js` (Import class)

- [ ] **3.15 View Logs**
  - File: `src/windows/LogWindow.jsx`
  - Button in toolbar
  - Show record activity logs
  - Audit trail
  - User and timestamp tracking
  - Reference: `/home/user/tryton/sao/src/window.js`

- [ ] **3.16 Revision History**
  - File: `src/windows/RevisionWindow.jsx`
  - Button in toolbar
  - Show historical record revisions
  - Compare versions
  - Restore previous version
  - Reference: `/home/user/tryton/sao/src/window.js` (Revision class)

---

## CATEGORY 4: SEARCH & FILTERING (Major gaps)

### Priority: HIGH

Currently implemented: Search Box with debouncing

- [x] **4.1 Search Box in List View** ✅ COMPLETED
  - Location: `src/components/ListView.jsx`
  - Full-text search input
  - Real-time search as you type (with 500ms debounce)
  - Keyboard shortcut: Ctrl+F
  - Searches across all char and text fields

- [x] **4.2 Domain Parser** ✅ COMPLETED
  - File: `src/tryton/search/DomainParser.js`
  - Parse search expressions: `name: John`, `age: > 30`
  - Operators: =, !=, <, >, <=, >=, in, not in, like, ilike
  - Boolean operators: & (AND), | (OR)
  - Date/numeric ranges: `age: 20..40`
  - Field auto-completion support
  - Lexer for tokenizing search expressions
  - Domain to string conversion
  - Reference: `/home/user/tryton/sao/src/common.js` (domain parser)

- [ ] **4.3 Advanced Filter Builder**
  - File: `src/components/FilterBuilder.jsx`
  - Modal with filter builder UI
  - Add/remove filter conditions
  - Visual domain construction
  - Field selector with operators
  - Reference: `/home/user/tryton/sao/src/window.js`

- [ ] **4.4 Search Bookmarks/Favorites**
  - File: `src/components/SearchBookmarks.jsx`
  - Star/unstar searches
  - Save search filters
  - Quick access to favorite searches
  - Reference: `/home/user/tryton/sao/src/screen.js`

- [ ] **4.5 Tab-based Domain Filters**
  - Location: `src/components/ListView.jsx`
  - Pre-defined filter tabs (All, Active, Archived, etc.)
  - Tab count badges
  - Custom tab domains

- [ ] **4.6 Search History**
  - Location: `src/components/ListView.jsx`
  - Dropdown of recent searches
  - Click to re-run search

- [ ] **4.7 Active/Archived Toggle**
  - Location: `src/components/ListView.jsx`
  - Toggle to show archived records
  - Respect 'active' field

- [ ] **4.8 Global Search**
  - File: `src/components/GlobalSearch.jsx`
  - Search across all models (Ctrl+K)
  - Navbar search bar
  - Search in menu items and records
  - Reference: `/home/user/tryton/sao/src/window.js`

---

## CATEGORY 5: IMPORT/EXPORT FEATURES

### Priority: MEDIUM-HIGH

Currently implemented: None

- [ ] **5.1 CSV Import Full Implementation**
  - File: `src/windows/ImportWindow.jsx`
  - File upload with drag & drop
  - Encoding selection (UTF-8, Latin-1, etc.)
  - Delimiter selection (comma, tab, semicolon, pipe)
  - Quote character selection
  - Field mapping interface
  - Preview data table
  - Validation before import
  - Progress indicator
  - Error handling and reporting
  - Language suffix support (name:en, name:fr)
  - RPC: `import_data` method
  - Reference: `/home/user/tryton/sao/src/window.js` (Import class)

- [ ] **5.2 CSV Export Full Implementation**
  - File: `src/windows/ExportWindow.jsx`
  - Field selection tree
  - Export all records vs. listed records
  - Tree indentation support
  - Language suffix support
  - Locale format option
  - Binary field handling
  - UTF-8 encoding
  - Saved export configurations
  - Export presets
  - RPC: `export_data` method
  - Reference: `/home/user/tryton/sao/src/window.js` (Export class)

- [ ] **5.3 Export from List View**
  - Location: `src/components/ListView.jsx`
  - Quick export button in toolbar
  - Export visible columns
  - Export all or selected rows
  - CSV download

---

## CATEGORY 6: WIZARD SYSTEM

### Priority: HIGH

Currently implemented: Full wizard system ✅

- [x] **6.1 Wizard Framework** ✅ COMPLETED
  - File: `src/tryton/wizard/WizardManager.js`
  - Multi-state workflow support
  - State transitions (next, previous, finish, cancel)
  - Dynamic form rendering per state
  - Button actions per state
  - Progress indicator
  - Reference: `/home/user/tryton/sao/src/wizard.js`

- [x] **6.2 Wizard Window Component** ✅ COMPLETED
  - File: `src/windows/WizardWindow.jsx`
  - Modal dialog for wizards
  - State navigation buttons
  - Form view per wizard state
  - Execute server-side wizard actions
  - RPC: `wizard.{action}.create/execute/delete` methods
  - Reference: `/home/user/tryton/sao/src/wizard.js`

- [x] **6.3 Wizard Action Executor** ✅ COMPLETED
  - Location: `src/tryton/actions/actionExecutor.js`
  - Handle `ir.action.wizard` type
  - Launch wizard windows
  - Pass context to wizard
  - Handle wizard results
  - Integrated into MainLayout.jsx

---

## CATEGORY 7: FORM LAYOUT COMPONENTS

### Priority: MEDIUM

Currently implemented: form, group, notebook, page, separator, label, field, button

### Missing Layout Components

- [x] **7.1 Paned Component (Horizontal/Vertical)** ✅ COMPLETED
  - File: `src/tryton/renderer/components/PanedComponent.jsx`
  - Splittable panes with draggable divider
  - Horizontal and vertical orientation
  - Resizable panels with mouse drag
  - Reference: `/home/user/tryton/sao/src/view/form.js`

- [x] **7.2 Expander Component** ✅ COMPLETED
  - File: `src/tryton/renderer/components/ExpanderComponent.jsx`
  - Collapsible section with expand/collapse
  - Header with arrow indicator
  - Bootstrap Collapse integration
  - Keyboard accessible (Enter/Space to toggle)
  - Reference: `/home/user/tryton/sao/src/view/form.js`

- [x] **7.3 Container Component Enhancements** ✅ COMPLETED
  - Location: `src/tryton/renderer/TrytonViewRenderer.jsx`
  - Better grid layout support
  - Column spanning (colspan attribute)
  - Row positioning (yexpand, yfill attributes)
  - Reference: `/home/user/tryton/sao/src/view/form.js` (Container class)

- [x] **7.4 Link Component** ✅ COMPLETED
  - File: `src/tryton/renderer/components/LinkComponent.jsx`
  - Clickable hyperlinks in forms
  - External URL support (opens in new tab)
  - Icon support
  - Action execution support
  - Reference: `/home/user/tryton/sao/src/view/form.js`

- [x] **7.5 Image Component** ✅ COMPLETED
  - File: `src/tryton/renderer/components/ImageComponent.jsx`
  - Static image display in forms
  - Image sizing attributes
  - Border styles (rounded, circle)
  - Support for URL, color, and icon types
  - URL size parameter support
  - Reference: `/home/user/tryton/sao/src/view/form.js`

---

## CATEGORY 8: TREE/LIST VIEW ENHANCEMENTS

### Priority: MEDIUM-HIGH

Currently implemented: Basic sortable list with pagination

### Missing Features

- [ ] **8.1 Tree Structure with Expand/Collapse**
  - Location: `src/components/ListView.jsx`
  - Hierarchical tree display
  - Parent-child relationships
  - Expand/collapse icons
  - Indent child rows
  - Reference: `/home/user/tryton/sao/src/view/tree.js`

- [ ] **8.2 Column Resizing**
  - Location: `src/components/ListView.jsx`
  - Draggable column borders
  - Persist column widths
  - Reference: `/home/user/tryton/sao/src/view/tree.js`

- [ ] **8.3 Optional Columns Toggle**
  - Location: `src/components/ListView.jsx`
  - Column visibility selector
  - Show/hide columns
  - Save column preferences
  - Reference: `/home/user/tryton/sao/src/view/tree.js`

- [ ] **8.4 Column Sum/Aggregation Footer**
  - Location: `src/components/ListView.jsx`
  - Sum/count/avg in table footer
  - Aggregate functions per column
  - Reference: `/home/user/tryton/sao/src/view/tree.js`

- [x] **8.5 Multiple Row Selection** ✅ COMPLETED
  - Location: `src/components/ListView.jsx`
  - Checkbox column for multi-select
  - Select all checkbox
  - Bulk delete action on selected rows
  - Visual highlight for selected rows

- [ ] **8.6 Inline Cell Editing**
  - Location: `src/components/ListView.jsx`
  - Click cell to edit
  - Save on blur/enter
  - Cancel on escape
  - Validation on edit
  - Reference: `/home/user/tryton/sao/src/view/tree.js` (editable mode)

- [ ] **8.7 Drag and Drop Row Reordering**
  - Location: `src/components/ListView.jsx`
  - Drag handle column
  - Visual drag feedback
  - Drop position indicator
  - Update sequence field on server
  - Integration: react-beautiful-dnd or @dnd-kit
  - Reference: `/home/user/tryton/sao/src/view/tree.js`

- [ ] **8.8 Context Menu on Rows**
  - Location: `src/components/ListView.jsx`
  - Right-click menu
  - Actions: Open, Delete, Duplicate, etc.
  - Reference: `/home/user/tryton/sao/src/view/tree.js`

- [ ] **8.9 Export to CSV from List**
  - Location: `src/components/ListView.jsx`
  - Export button in toolbar
  - Export all visible columns
  - Export all or selected rows
  - Quick CSV download

- [ ] **8.10 Button Columns**
  - Location: `src/components/ListView.jsx`
  - Render buttons in tree columns
  - Execute button actions from list
  - Reference: `/home/user/tryton/sao/src/view/tree.js`

- [ ] **8.11 Infinite Scroll**
  - Location: `src/components/ListView.jsx`
  - Load more records on scroll
  - Replace or augment pagination
  - Performance optimization
  - Reference: `/home/user/tryton/sao/src/view/tree.js`

---

## CATEGORY 9: ONE2MANY / MANY2MANY IMPROVEMENTS

### Priority: HIGH

Currently implemented: Full CRUD operations in both widgets ✅

### Missing Features

- [x] **9.1 Add New Record in One2Many** ✅ COMPLETED
  - Location: `src/tryton/registry/widgets/One2ManyWidget.jsx`
  - New button creates new related records
  - Modal FormDialog for new record
  - Save to parent record relationship
  - Reference: `/home/user/tryton/sao/src/view/form.js` (One2Many class)

- [x] **9.2 Edit Existing Record in One2Many** ✅ COMPLETED
  - Location: `src/tryton/registry/widgets/One2ManyWidget.jsx`
  - Edit button on each row
  - Modal FormDialog for editing
  - Save changes functionality
  - Reference: `/home/user/tryton/sao/src/view/form.js`

- [x] **9.3 Add Existing Records in Many2Many** ✅ COMPLETED
  - Location: `src/tryton/registry/widgets/Many2ManyWidget.jsx`
  - Add button to select existing records
  - SearchDialog modal with multi-select
  - Add to relationship
  - Reference: `/home/user/tryton/sao/src/view/form.js` (Many2Many class)

- [x] **9.4 Inline Tree Editing** ✅ COMPLETED
  - Location: Both O2M and M2M widgets
  - Editable cells in grid (click to edit)
  - Tab navigation between cells (Tab/Shift+Tab)
  - Auto-save on blur or Enter key
  - Escape key to cancel editing
  - Visual highlight for editing cell (yellow background)
  - Supports text, number, and boolean field types
  - Error handling with value reversion on failure
  - Reference: `/home/user/tryton/sao/src/view/tree.js`

- [x] **9.5 Tree View Configuration** ✅ COMPLETED
  - Location: Both O2M and M2M widgets
  - Parse tree view definition from relation (fieldsViewGet)
  - Extract field order from view XML structure
  - Dynamic column generation from tree view children
  - Support for editable attribute (`editable="1"` in tree XML)
  - Column metadata includes readonly, type from field definitions
  - Fallback to all fields if tree structure not found
  - Reference: `/home/user/tryton/sao/src/view/form.js`

---

## CATEGORY 10: KEYBOARD SHORTCUTS ✅ COMPLETED

### Priority: MEDIUM

Currently implemented: Full keyboard shortcut system with help dialog

- [x] **10.1 Keyboard Shortcut System** ✅ COMPLETED
  - File: `src/hooks/useKeyboardShortcuts.js`
  - Global keyboard listener
  - Shortcut registration system with parseShortcut and matchesShortcut functions
  - Support for Ctrl, Alt, Shift, and Meta modifiers
  - Smart input field detection (doesn't interfere with typing)
  - Cross-platform support (Cmd on Mac, Ctrl on Windows/Linux)
  - Reference: `/home/user/tryton/sao/src/common.js` (keyboard handling)

- [x] **10.2 Implement All SAO Shortcuts** ✅ COMPLETED
  - Location: Various components
  - **MainLayout.jsx:** F1 - Help, Alt+W - Close tab, Alt+Tab - Next tab, Alt+Shift+Tab - Previous tab, Ctrl+Tab - Cycle tabs
  - **FormView.jsx:** Ctrl+S - Save, Ctrl+N - New, Ctrl+D - Delete, Ctrl+Shift+D - Duplicate, Ctrl+R - Reload, Ctrl+L - Switch view, Ctrl+Up - Previous record, Ctrl+Down - Next record
  - **ListView.jsx:** Ctrl+F - Search (focuses search input), Ctrl+N - New
  - Future shortcuts (to be implemented with future features): Ctrl+K - Global search, Ctrl+P - Print, Ctrl+E - Action menu, Ctrl+Shift+T - Attachments, Ctrl+Shift+O - Notes, Ctrl+Shift+E - Email, Ctrl+Shift+R - Related records
  - Reference: `/home/user/tryton/sao/src/common.js`

- [x] **10.3 Visual Keyboard Shortcut Help** ✅ COMPLETED
  - File: `src/components/KeyboardShortcutHelp.jsx`
  - Help modal showing all shortcuts (opens with F1)
  - Organized by category (General, Record Actions, View Actions, Advanced Actions, Tab Management)
  - Searchable list with real-time filtering
  - Clean, user-friendly interface with Bootstrap styling
  - Shows available and future shortcuts
  - Note about Mac Cmd key compatibility
  - Reference: `/home/user/tryton/sao/src/window.js`

---

## CATEGORY 11: INTERNATIONALIZATION (i18n)

### Priority: MEDIUM

Currently implemented: None

- [ ] **11.1 i18n Framework Setup**
  - File: `src/i18n/index.js`
  - Integration: react-i18next or similar
  - Translation file structure
  - Language switching
  - Reference: `/home/user/tryton/sao/src/common.js` (Gettext)

- [ ] **11.2 Multi-language Support**
  - Location: Throughout app
  - Translate all UI strings
  - Language selector in preferences
  - Fetch translations from server
  - Reference: `/home/user/tryton/sao/src/common.js`

- [ ] **11.3 Date/Time/Number Localization**
  - File: `src/utils/locale.js`
  - Locale-based date formatting
  - Locale-based number formatting
  - Currency formatting
  - Integration: date-fns or Intl API
  - Reference: `/home/user/tryton/sao/src/common.js`

- [ ] **11.4 RTL (Right-to-Left) Support**
  - Location: CSS and layout components
  - RTL stylesheet
  - Direction switching
  - Mirror layout for RTL languages
  - Reference: `/home/user/tryton/sao/src/common.js`

- [ ] **11.5 Translation Dialog**
  - File: `src/windows/TranslationWindow.jsx`
  - Edit field translations
  - Multi-language form
  - Save translations per language
  - Reference: `/home/user/tryton/sao/src/window.js`

---

## CATEGORY 12: USER PREFERENCES & SETTINGS

### Priority: MEDIUM

Currently implemented: All features ✅

- [x] **12.1 Preferences Window** ✅ COMPLETED
  - File: `src/windows/PreferencesWindow.jsx`
  - User settings modal
  - Language selection
  - Date format preference
  - Number format preference
  - Thousands separator
  - Locale settings
  - Save preferences to server
  - RPC: `model('res.user').write` method
  - Reference: `/home/user/tryton/sao/src/preferences.js`

- [x] **12.2 Avatar Display** ✅ COMPLETED
  - Location: Navbar user dropdown in `src/components/MainLayout.jsx`
  - User avatar with initials
  - Initials fallback (extracts from username)
  - Circular design with primary color
  - Reference: `/home/user/tryton/sao/src/preferences.js`

- [x] **12.3 Theme Customization UI** ✅ COMPLETED
  - Location: Integrated into `src/windows/PreferencesWindow.jsx` Theme tab
  - Color picker for theme colors (primary, secondary, success, danger, warning, info)
  - Live preview changes
  - Save theme preferences to localStorage
  - Dark mode toggle
  - Reference: `/home/user/tryton/sao/src/common.js`

---

## CATEGORY 13: DIALOGS & MODALS

### Priority: MEDIUM-HIGH

Currently implemented: Basic confirm dialog for button actions

- [ ] **13.1 Standardized Dialog System**
  - File: `src/components/dialogs/DialogManager.jsx`
  - Centralized dialog management
  - Dialog queue
  - Reference: `/home/user/tryton/sao/src/window.js`

- [ ] **13.2 Message Dialog**
  - File: `src/components/dialogs/MessageDialog.jsx`
  - Info/warning/error message display
  - Icon and title
  - OK button
  - Reference: `/home/user/tryton/sao/src/window.js`

- [ ] **13.3 Confirmation Dialog (Sur)**
  - File: `src/components/dialogs/ConfirmDialog.jsx`
  - Yes/No confirmation
  - Custom message
  - Promise-based
  - Reference: `/home/user/tryton/sao/src/window.js`

- [ ] **13.4 Three-Button Dialog (Sur3B)**
  - File: `src/components/dialogs/ThreeButtonDialog.jsx`
  - Yes/No/Cancel
  - Reference: `/home/user/tryton/sao/src/window.js`

- [ ] **13.5 Ask Dialog (Text Input)**
  - File: `src/components/dialogs/AskDialog.jsx`
  - Prompt for text input
  - Validation
  - Reference: `/home/user/tryton/sao/src/window.js`

- [ ] **13.6 User Warning Dialog**
  - File: `src/components/dialogs/UserWarningDialog.jsx`
  - Server-side warnings
  - Always/OK/Cancel options
  - Remember choice
  - Reference: `/home/user/tryton/sao/src/window.js`

- [ ] **13.7 Concurrency Dialog**
  - File: `src/components/dialogs/ConcurrencyDialog.jsx`
  - Handle concurrent updates
  - Show conflicts
  - Force save / cancel options
  - Reference: `/home/user/tryton/sao/src/window.js`

- [ ] **13.8 Help Dialog**
  - File: `src/components/dialogs/HelpDialog.jsx`
  - Context-sensitive help (F1)
  - Model/field documentation
  - Reference: `/home/user/tryton/sao/src/window.js`

---

## CATEGORY 14: ERROR HANDLING & VALIDATION

### Priority: MEDIUM

Currently implemented: Basic validation in useFormValidation hook

- [ ] **14.1 Enhanced Error Display**
  - Location: Throughout app
  - Better error messages
  - Stack trace in development
  - User-friendly messages in production
  - Error reporting system

- [ ] **14.2 Validation Error Display**
  - Location: Form and field widgets
  - Field-level error messages (already done)
  - Form-level error summary
  - Scroll to first error
  - Highlight all invalid fields

- [ ] **14.3 Concurrency Exception Handling**
  - File: `src/api/rpc.js` (already has exception class)
  - Detect concurrent updates
  - Show concurrency dialog
  - Allow force save or reload
  - Reference: `/home/user/tryton/sao/src/rpc.js`

- [ ] **14.4 User Error Display**
  - Location: Throughout app
  - Display UserError from server
  - Modal or alert
  - Reference: `/home/user/tryton/sao/src/rpc.js`

- [ ] **14.5 Network Error Handling**
  - Location: `src/api/rpc.js`
  - Retry logic for transient errors
  - Offline detection
  - Reconnection handling
  - Reference: `/home/user/tryton/sao/src/rpc.js`

---

## CATEGORY 15: REAL-TIME FEATURES

### Priority: LOW-MEDIUM

Currently implemented: None

- [ ] **15.1 Message Bus Integration**
  - File: `src/services/messageBus.js`
  - Connect to Tryton bus
  - WebSocket or long-polling
  - Message subscription
  - Reference: `/home/user/tryton/sao/src/bus.js`

- [ ] **15.2 Real-time Notifications**
  - File: `src/components/Notifications.jsx`
  - Display notifications from bus
  - Toast/banner notifications
  - Notification center
  - Reference: `/home/user/tryton/sao/src/bus.js`

- [ ] **15.3 Auto-refresh on Changes**
  - Location: ListView, FormView
  - Subscribe to model changes
  - Auto-reload when records change
  - Conflict resolution

---

## CATEGORY 16: PERFORMANCE OPTIMIZATIONS

### Priority: MEDIUM

Currently implemented: Basic pagination (80 records)

- [ ] **16.1 Lazy Loading**
  - Location: ListView, Tree widgets
  - Load records on demand
  - Virtualized scrolling for large lists
  - Integration: react-window or react-virtualized

- [ ] **16.2 Eager Loading Options**
  - Location: FormView, widgets
  - Pre-fetch related data
  - Configurable eager loading
  - Reference: `/home/user/tryton/sao/src/model.js`

- [ ] **16.3 Caching Strategy**
  - File: `src/services/cache.js`
  - Cache model definitions
  - Cache view definitions
  - Cache recent records
  - Invalidation on updates

- [ ] **16.4 Debouncing & Throttling**
  - Location: Search, on_change calls
  - Debounce search input (already done for Many2One)
  - Throttle on_change calls
  - Prevent excessive RPC calls

- [ ] **16.5 Display Size Limits**
  - Location: ListView
  - Configurable page size
  - Adaptive loading
  - Reference: `/home/user/tryton/sao/src/screen.js`

---

## CATEGORY 17: BARCODE SCANNING

### Priority: LOW

Currently implemented: None

- [ ] **17.1 Code Scanner Window**
  - File: `src/windows/CodeScannerWindow.jsx`
  - Camera access for barcode scanning
  - Barcode detection
  - Submit/loop modes
  - On-scan-code handler
  - Integration: react-qr-barcode-scanner or similar
  - Reference: `/home/user/tryton/sao/src/window.js` (Scanner class)

---

## CATEGORY 18: HISTORY & AUDIT

### Priority: LOW-MEDIUM

Currently implemented: None

- [ ] **18.1 View Logs Window**
  - File: `src/windows/LogWindow.jsx`
  - Display record activity logs
  - User and timestamp tracking
  - Action types (create, write, delete)
  - Field-level change tracking
  - Reference: `/home/user/tryton/sao/src/window.js`

- [ ] **18.2 Revision History Window**
  - File: `src/windows/RevisionWindow.jsx`
  - List all revisions of record
  - Compare revisions
  - Restore to previous revision
  - Reference: `/home/user/tryton/sao/src/window.js`

- [ ] **18.3 XML ID Display**
  - Location: FormView (developer mode)
  - Show XML IDs for records
  - Developer tools panel
  - Reference: `/home/user/tryton/sao/src/window.js`

---

## CATEGORY 19: MISCELLANEOUS UI IMPROVEMENTS

### Priority: VARIES

- [ ] **19.1 Tooltips**
  - Location: Throughout app
  - Field help text as tooltips
  - Button tooltips
  - Icon tooltips
  - Integration: react-bootstrap Tooltip

- [ ] **19.2 Loading Indicators**
  - Location: Throughout app
  - Better loading states (already have some)
  - Skeleton loaders
  - Progress bars for long operations

- [ ] **19.3 Empty States**
  - Location: ListView, TabManager (already have some)
  - Improve empty state messaging
  - Call-to-action buttons
  - Helpful illustrations

- [ ] **19.4 Responsive Design Improvements**
  - Location: All components
  - Better mobile layout
  - Touch-friendly interactions
  - Adaptive UI for small screens
  - Hamburger menu for mobile

- [ ] **19.5 Accessibility (a11y)**
  - Location: Throughout app
  - ARIA labels
  - Keyboard navigation
  - Screen reader support
  - Focus management
  - Color contrast

- [ ] **19.6 Drag & Drop File Upload**
  - Location: Binary/Image widgets, Import/Export
  - Drop zone styling
  - Visual feedback
  - Multiple file support

- [ ] **19.7 Context Menus**
  - Location: ListView, FormView
  - Right-click menus
  - Contextual actions
  - Integration: react-contexify or similar

- [ ] **19.8 Breadcrumbs**
  - Location: MainLayout or TabManager
  - Navigation breadcrumb trail
  - Click to navigate back
  - Show current location

- [ ] **19.9 Status Bar**
  - Location: Bottom of viewport
  - Record count
  - Current record position
  - Status messages
  - Reference: `/home/user/tryton/sao/src/screen.js`

- [ ] **19.10 Badge/Count Indicators**
  - Location: Various buttons and tabs
  - Attachment count badge (already mentioned)
  - Note count badge
  - Unread counts
  - Visual indicators

---

## CATEGORY 20: ADVANCED RPC & DATA OPERATIONS

### Priority: MEDIUM

Currently implemented: 20+ RPC methods in `src/api/rpc.js`

- [ ] **20.1 Batch RPC Calls**
  - Location: `src/api/rpc.js`
  - Combine multiple RPC calls
  - Reduce network overhead
  - Reference: `/home/user/tryton/sao/src/rpc.js`

- [ ] **20.2 RPC Call Queuing**
  - Location: `src/api/rpc.js`
  - Queue calls when offline
  - Retry on reconnection
  - Reference: `/home/user/tryton/sao/src/rpc.js`

- [ ] **20.3 Additional RPC Methods**
  - Location: `src/api/rpc.js`
  - Ensure all SAO RPC methods are implemented
  - `button` - Execute button (might be incomplete)
  - `on_change_with` - Field dependencies
  - `autocompletion` - Autocomplete suggestions
  - Reference: `/home/user/tryton/sao/src/rpc.js`

---

## CATEGORY 21: DOMAIN & PYSON EVALUATION

### Priority: MEDIUM-HIGH

Currently implemented: Basic domain support

- [ ] **21.1 Advanced Domain Evaluation**
  - File: `src/tryton/pyson/domain.js`
  - Full PYSON domain evaluation
  - Context evaluation
  - Dynamic domain from states
  - Reference: `/home/user/tryton/sao/src/pyson.js`

- [ ] **21.2 PYSON Decoder**
  - File: `src/tryton/pyson/decoder.js`
  - Decode PYSON expressions
  - Eval, If, Get, In, etc.
  - Reference: `/home/user/tryton/sao/src/pyson.js`

- [ ] **21.3 Dynamic States (Invisible, Readonly, Required)**
  - Location: `src/hooks/useFormValidation.js` (partially done)
  - Evaluate states attributes
  - Apply dynamically based on field values
  - Hide/show fields
  - Enable/disable fields
  - Reference: `/home/user/tryton/sao/src/view/form.js`

---

## CATEGORY 22: TAB & WINDOW MANAGEMENT

### Priority: LOW-MEDIUM

Currently implemented: Basic tab open/close/switch

- [ ] **22.1 Tab Context Menu**
  - Location: `src/components/TabManager.jsx`
  - Right-click on tab
  - Close, Close Others, Close All
  - Reference: `/home/user/tryton/sao/src/tab.js`

- [ ] **22.2 Tab State Persistence**
  - Location: `src/store/tabs.js`
  - Save tab state to URL
  - Restore tabs on page reload
  - Reference: `/home/user/tryton/sao/src/tab.js`

- [ ] **22.3 Tab Keyboard Navigation**
  - Location: `src/components/TabManager.jsx`
  - Alt+Tab - Next tab
  - Alt+Shift+Tab - Previous tab
  - Alt+W - Close current tab
  - Ctrl+Tab - Cycle tabs

- [ ] **22.4 Multiple Windows**
  - Location: Throughout app
  - Open forms in new browser windows/tabs
  - Window communication
  - Reference: `/home/user/tryton/sao/src/window.js`

---

## CATEGORY 23: PLUGINS & EXTENSIBILITY

### Priority: LOW

Currently implemented: None

- [ ] **23.1 Plugin System**
  - File: `src/plugins/index.js`
  - Plugin registration
  - Custom widgets
  - Custom views
  - Hooks/events
  - Reference: `/home/user/tryton/sao/src/plugins.js`

- [ ] **23.2 Custom CSS Support**
  - Location: App configuration
  - Load custom stylesheets
  - Theme overrides
  - Reference: `/home/user/tryton/sao/src/common.js`

- [ ] **23.3 Custom JavaScript Support**
  - Location: App configuration
  - Load custom scripts
  - Extend functionality
  - Reference: `/home/user/tryton/sao/src/common.js`

---

## CATEGORY 24: TESTING & QUALITY

### Priority: MEDIUM

Currently implemented: None

- [ ] **24.1 Unit Tests**
  - Directory: `tests/unit/`
  - Test utilities and helpers
  - Test RPC client
  - Test PYSON decoder
  - Test domain parser
  - Integration: Vitest or Jest

- [ ] **24.2 Component Tests**
  - Directory: `tests/components/`
  - Test widgets
  - Test views
  - Test dialogs
  - Integration: React Testing Library

- [ ] **24.3 Integration Tests**
  - Directory: `tests/integration/`
  - Test full workflows
  - Test form save/load
  - Test list operations
  - Integration: Playwright or Cypress

- [ ] **24.4 End-to-End Tests**
  - Directory: `tests/e2e/`
  - Test complete user flows
  - Login, navigate, CRUD operations
  - Integration: Playwright or Cypress

---

## CATEGORY 25: DOCUMENTATION

### Priority: LOW-MEDIUM

- [ ] **25.1 Developer Documentation**
  - File: `docs/DEVELOPER.md`
  - Architecture overview
  - Component documentation
  - Contributing guide
  - Code style guide

- [ ] **25.2 API Documentation**
  - File: `docs/API.md`
  - RPC method documentation
  - Store documentation
  - Hook documentation
  - JSDoc comments

- [ ] **25.3 User Documentation**
  - File: `docs/USER_GUIDE.md`
  - User manual
  - Feature explanations
  - Screenshots
  - Keyboard shortcuts reference

- [ ] **25.4 Component Storybook**
  - Directory: `.storybook/`
  - Storybook setup
  - Stories for all widgets
  - Interactive component gallery
  - Integration: Storybook

---

## PRIORITY SUMMARY

### Critical (Must-have for MVP)
1. Delete button (3.1)
2. Duplicate button (3.2)
3. Previous/Next navigation (3.3)
4. Toolbar actions (3.4-3.5)
5. Attachment manager (3.6)
6. Search & filter (4.1-4.5)
7. Print/Report generation (3.11)
8. Wizard system (6.1-6.3)
9. Add/Edit in One2Many (9.1-9.2)
10. Add in Many2Many (9.3)

### High Priority (Core functionality)
1. Missing widgets (1.1-1.21) - especially Binary, RichText, Reference
2. Calendar and Graph views (2.1-2.2)
3. Export/Import (5.1-5.2, 3.13-3.14)
4. Tree view enhancements (8.1-8.11)
5. Email integration (3.12)
6. Advanced domain evaluation (21.1-21.3)
7. Action menu (3.9)
8. Related records (3.10)

### Medium Priority (Enhanced UX)
1. Keyboard shortcuts (10.1-10.3)
2. i18n support (11.1-11.5)
3. User preferences (12.1-12.3)
4. Dialogs & modals (13.1-13.8)
5. Form layout components (7.1-7.5)
6. Performance optimizations (16.1-16.5)
7. Notes & chat (3.7-3.8)
8. View logs & revision history (3.15-3.16, 18.1-18.2)
9. Testing (24.1-24.4)

### Low Priority (Nice-to-have)
1. Board/Dashboard view (2.3)
2. Barcode scanning (17.1)
3. Real-time features (15.1-15.3)
4. Plugins & extensibility (23.1-23.3)
5. Advanced UI improvements (19.1-19.10)
6. Documentation (25.1-25.4)

---

## IMPLEMENTATION STRATEGY

### Phase 1: Critical Functionality (Weeks 1-4)
- Toolbar actions (delete, duplicate, prev/next)
- Attachment manager
- Basic search & filter
- Report generation
- Wizard framework

### Phase 2: Core Widgets & Views (Weeks 5-8)
- Binary/Image/Document widgets
- RichText widget
- Reference widget
- Time/TimeDelta widgets
- Calendar view
- Graph view

### Phase 3: Data Management (Weeks 9-12)
- Import/Export full implementation
- One2Many/Many2Many editing
- Tree view enhancements (hierarchy, column resize)
- Inline editing

### Phase 4: UX & Productivity (Weeks 13-16)
- Keyboard shortcuts
- Email integration
- Action menu & related records
- User preferences
- i18n support

### Phase 5: Advanced Features (Weeks 17-20)
- Advanced domain evaluation
- Form layout components (Paned, Expander)
- View logs & revisions
- Notes & chat
- Real-time features

### Phase 6: Quality & Polish (Weeks 21-24)
- Testing (unit, component, e2e)
- Performance optimizations
- Accessibility improvements
- Documentation
- Bug fixes

---

## METRICS

**Total Tasks**: ~210 tasks
**Current Implementation**: ~15% complete (based on features)
**Estimated Effort**: 24+ weeks for full parity
**Lines of Code Gap**: ~14,000 lines (19,000 SAO - 5,000 React)

---

## CONCLUSION

This tasks list provides a comprehensive roadmap to achieve feature parity between the new React UI and the old jQuery SAO client. The prioritization allows for incremental delivery of value while working toward full feature completeness.

**Next Steps:**
1. Review and validate task priorities with stakeholders
2. Create detailed implementation specs for Phase 1 tasks
3. Set up project tracking (GitHub Projects, Jira, etc.)
4. Begin Phase 1 development
5. Iterate based on user feedback and business priorities

**Note**: Some tasks may be deprioritized if certain features are not needed for your specific use case. Consider conducting a user research phase to validate which features are most critical for your users.
