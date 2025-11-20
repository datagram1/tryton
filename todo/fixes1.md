# React UI Migration Task List

**Status:** In Progress
**Target:** Migrate all Bootstrap3/SAO functionality to React UI
**Priority:** Complete relationship widget features (One2Many, Many2Many)

---

## 📍 Current Issues

- **One2ManyWidget**: Add button disabled - "Not yet implemented" (line 123)
- **Many2ManyWidget**: Add button disabled - "Not yet implemented" (line 124)

---

## Phase 1: Core Relationship Management 🔴 HIGH PRIORITY

### Task 1.1: Implement Many2Many Search Input & Autocomplete
**File:** `web-client-next/src/tryton/registry/widgets/Many2ManyWidget.jsx`
**Reference:** `sao/src/view/form.js:4043-4059, 4396-4413`

- [ ] Add text input field to toolbar (replace empty state add button area)
- [ ] Implement autocomplete dropdown component
  - [ ] Create `useCompletion` hook or component
  - [ ] Implement `_update_completion()` - search backend as user types
  - [ ] Display matching records in dropdown
  - [ ] Handle keyboard navigation (up/down arrows)
- [ ] Implement completion match selection
  - [ ] On selection, add record to relationship
  - [ ] Clear input field after selection
- [ ] Style input field to match SAO design (input-group-sm)

---

### Task 1.2: Implement Many2Many Add Button (Search Dialog)
**File:** `web-client-next/src/tryton/registry/widgets/Many2ManyWidget.jsx`
**Reference:** `sao/src/view/form.js:4237-4284`

- [ ] Create `SearchDialog` component (reusable for all relationship widgets)
  - [ ] Modal dialog with search interface
  - [ ] Search input with real-time filtering
  - [ ] Results table/list view
  - [ ] Multi-select capability (checkboxes)
  - [ ] OK/Cancel buttons
- [ ] Implement Add button click handler
  - [ ] Build domain filter (exclude already-related records)
  - [ ] Get search context from field
  - [ ] Get search order from field
  - [ ] Pre-fill search filter from text input value
  - [ ] Open SearchDialog with proper configuration
- [ ] Handle search results callback
  - [ ] Load selected record IDs into relationship
  - [ ] Refresh the display
  - [ ] Clear search input field
- [ ] Prevent multiple popups (`_popup` flag management)

---

### Task 1.3: Implement One2Many Add Button (Search Dialog)
**File:** `web-client-next/src/tryton/registry/widgets/One2ManyWidget.jsx`
**Reference:** `sao/src/view/form.js:3677-3738`

- [ ] Add search input field to toolbar (if `add_remove` attribute is set)
  - [ ] Create input-group with search field
  - [ ] Add autocomplete support (reuse from Many2Many)
- [ ] Implement Add button click handler
  - [ ] Check write_access and read_access permissions
  - [ ] Build complex domain filter:
    - [ ] Get field domain
    - [ ] Add `add_remove` domain if specified
    - [ ] Exclude existing relationship IDs
    - [ ] Include removed IDs (to allow re-adding)
  - [ ] Open SearchDialog with multi-select
- [ ] Handle search results callback
  - [ ] Load selected record IDs
  - [ ] Update sequence if specified in view
  - [ ] Set cursor position
  - [ ] Clear search input
- [ ] Enable Add button (remove `disabled` attribute)

---

## Phase 2: Record Creation 🟡 MEDIUM PRIORITY

### Task 2.1: Create FormDialog Component
**Reference:** `sao/src/window.js` - `Sao.Window.Form`

- [ ] Create reusable `FormDialog` component
  - [ ] Modal dialog wrapper
  - [ ] Embed FormView component inside
  - [ ] Handle save/cancel actions
  - [ ] Support "new" mode vs "edit" mode
  - [ ] Props: screen, callback, options (new_, defaults, many)
- [ ] Implement form validation before close
- [ ] Handle multiple record creation (`many` parameter)
- [ ] Return created record ID(s) to callback

---

### Task 2.2: Implement Many2Many New Button
**File:** `web-client-next/src/tryton/registry/widgets/Many2ManyWidget.jsx`
**Reference:** `sao/src/view/form.js:4366-4394`

- [ ] Create New button in toolbar
- [ ] Implement click handler
  - [ ] Check create_access permission
  - [ ] Prevent multiple popups
  - [ ] Pre-fill defaults with `rec_name` from search input
  - [ ] Create form screen for target model
- [ ] Open FormDialog
  - [ ] Configure for "new" mode
  - [ ] Set save_current: true
  - [ ] Pass defaults
- [ ] Handle callback when record created
  - [ ] Load new record ID into relationship
  - [ ] Clear search input
  - [ ] Reset popup flag

---

### Task 2.3: Implement One2Many New Button
**File:** `web-client-next/src/tryton/registry/widgets/One2ManyWidget.jsx`
**Reference:** `sao/src/view/form.js:3747-3795`

- [ ] Enable New button (currently disabled)
- [ ] Implement `new_()` method
  - [ ] Check model access permissions
  - [ ] Handle `add_remove` attribute for rec_name defaults
  - [ ] Call validation before opening form
  - [ ] Route to `new_single()` or `new_product()` based on attributes
- [ ] Implement `new_single()` method
  - [ ] Check if current view is creatable (inline)
  - [ ] If inline: call `screen.new_()` to add row
  - [ ] If not: open FormDialog
  - [ ] Handle `size` limit (max records)
  - [ ] Update sequence after creation
- [ ] Implement `new_product()` method (if needed)
  - [ ] Handle `product` attribute (comma-separated field names)
  - [ ] Create multiple records from product combinations
  - [ ] Open search dialogs for each product field
  - [ ] Generate cartesian product of selections

---

## Phase 3: Record Editing 🟡 MEDIUM PRIORITY

### Task 3.1: Implement One2Many Edit/Open Button
**File:** `web-client-next/src/tryton/registry/widgets/One2ManyWidget.jsx`
**Reference:** `sao/src/view/form.js:3403-3411`

- [ ] Enable Edit button (currently disabled)
- [ ] Implement click handler
  - [ ] Get currently selected record
  - [ ] Check read_access permission
  - [ ] Check if form view is available (`has_form`)
- [ ] Open FormDialog with selected record
  - [ ] Load record data
  - [ ] Allow editing
  - [ ] Save changes back to relationship
- [ ] Update button sensitivity based on:
  - [ ] Has selected record
  - [ ] Has read access
  - [ ] Form view is available in modes

---

### Task 3.2: Implement Many2Many Edit Functionality
**File:** `web-client-next/src/tryton/registry/widgets/Many2ManyWidget.jsx`
**Reference:** `sao/src/view/form.js:4333-4362`

- [ ] Implement row click handler (`activate`)
  - [ ] Call `edit()` method on row click
- [ ] Implement `edit()` method
  - [ ] Check if current record exists
  - [ ] Prevent multiple popups
  - [ ] Create form screen (not linked to parent)
  - [ ] Load selected record
- [ ] Open FormDialog in edit mode
- [ ] Handle callback after save
  - [ ] Force reload of record data
  - [ ] Preserve "added" state if new record
  - [ ] Refresh display

---

### Task 3.3: Implement SearchDialog with Inline Creation
**Reference:** `sao/src/window.js` - `Sao.Window.Search`

- [ ] Enhance SearchDialog component
  - [ ] Add "New" button in search dialog
  - [ ] Show when `new_` permission is true
  - [ ] Open FormDialog from within SearchDialog
  - [ ] Add newly created record to search results
  - [ ] Allow immediate selection of new record
- [ ] Support search filtering
  - [ ] Domain parser for complex queries
  - [ ] Real-time search results
  - [ ] Pagination for large result sets

---

## Phase 4: Enhanced Navigation & UX 🟢 LOW PRIORITY

### Task 4.1: Implement One2Many View Switching
**File:** `web-client-next/src/tryton/registry/widgets/One2ManyWidget.jsx`
**Reference:** `sao/src/view/form.js:3314-3322`

- [ ] Add Switch button to toolbar
- [ ] Implement view mode tracking (tree vs form)
- [ ] Implement `switch_()` method
  - [ ] Toggle between available view modes
  - [ ] Preserve current record selection
  - [ ] Update screen view
- [ ] Update button sensitivity
  - [ ] Enable only when multiple views available
  - [ ] Enable only when record is selected or in form view
  - [ ] Check `screen.number_of_views > 1`

---

### Task 4.2: Implement One2Many Previous/Next Navigation
**File:** `web-client-next/src/tryton/registry/widgets/One2ManyWidget.jsx`
**Reference:** `sao/src/view/form.js:3324-3349`

- [ ] Add Previous button to toolbar
- [ ] Add Next button to toolbar
- [ ] Track current position in record list (`_position`, `_length`)
- [ ] Implement `previous()` method
  - [ ] Move to previous record
  - [ ] Update position
  - [ ] Disable at first record
- [ ] Implement `next()` method
  - [ ] Move to next record
  - [ ] Update position
  - [ ] Disable at last record
- [ ] Update position label badge
  - [ ] Show "X / Y" format
  - [ ] Show "X#N / Y" when multiple selected
- [ ] Implement `record_message()` method
  - [ ] Update position display
  - [ ] Update button sensitivity

---

### Task 4.3: Implement Delete/Undelete for One2Many
**File:** `web-client-next/src/tryton/registry/widgets/One2ManyWidget.jsx`
**Reference:** `sao/src/view/form.js:3413-3431`

- [ ] Add Undelete button to toolbar
- [ ] Implement `undelete()` method
  - [ ] Mark deleted records as not deleted
  - [ ] Refresh display
- [ ] Update Delete button behavior
  - [ ] Check if records are deletable
  - [ ] Check delete_access permission
  - [ ] Update button sensitivity based on selection
- [ ] Update button visibility
  - [ ] Show Undelete only when deleted records selected
  - [ ] Show Delete only when non-deleted records selected

---

### Task 4.4: Implement Remove/Unremove for Many2Many
**File:** `web-client-next/src/tryton/registry/widgets/Many2ManyWidget.jsx`
**Reference:** `sao/src/view/form.js:4091-4098, 4289-4290`

- [ ] Enhance existing Remove button
  - [ ] Check button sensitivity rules
  - [ ] Enable only when non-removed records selected
- [ ] Add Unremove button to toolbar
- [ ] Implement `unremove()` method
  - [ ] Call `screen.unremove()` on selected records
  - [ ] Refresh display
- [ ] Update button visibility
  - [ ] Enable Unremove only when removed records selected
  - [ ] Update position display

---

### Task 4.5: Implement Keyboard Shortcuts
**Files:** Both One2Many and Many2Many widgets
**Reference:** `sao/src/view/form.js:3465, 4292-4306`

- [ ] Implement `key_press()` handler for Many2Many
  - [ ] F2: Open Add dialog
  - [ ] F3: Create New record
  - [ ] Tab/Enter: Activate autocomplete selection
- [ ] Implement keyboard shortcuts for One2Many
  - [ ] Tab/Enter: Add from autocomplete (if add_remove)
  - [ ] F2/F3: Map to Add/New buttons
- [ ] Add keyboard hints to button tooltips
- [ ] Ensure mousetrap class or keyboard handling library

---

### Task 4.6: Implement Size Limits & Validation
**Files:** Both One2Many and Many2Many widgets
**Reference:** `sao/src/view/form.js:3518-3530, 4157-4167`

- [ ] Implement size limit evaluation
  - [ ] Get `size` attribute from field definition
  - [ ] Evaluate size expression with record context
  - [ ] Calculate current relationship size
  - [ ] Set `size_limit` flag when limit reached
- [ ] Update button sensitivity based on size limit
  - [ ] Disable Add button when at limit
  - [ ] Disable New button when at limit
  - [ ] Show warning message when limit reached
- [ ] Handle readonly mode size limit
  - [ ] Limit display to size limit when readonly
  - [ ] Show all records when editable

---

## Supporting Infrastructure 🔧

### Task S.1: Create Screen Management System
**Reference:** `sao/src/screen.js`

- [ ] Create `Screen` class/hook for embedded record management
  - [ ] Manage record groups
  - [ ] Handle view switching (tree/form/graph)
  - [ ] Track current record and selection
  - [ ] Domain and context management
  - [ ] Pagination and limits
- [ ] Implement record group operations
  - [ ] Load records from IDs
  - [ ] Add/remove records
  - [ ] Track deleted/removed state
  - [ ] Sequence management
- [ ] Integration with existing FormView
  - [ ] Reuse existing screen logic where possible
  - [ ] Ensure proper parent-child relationship

---

### Task S.2: Implement Domain Parser
**Reference:** `sao/src/view/form.js:3723, 4271`

- [ ] Create `DomainParser` utility
  - [ ] Parse domain expressions
  - [ ] Quote search text for filtering
  - [ ] Combine multiple domain clauses (AND/OR)
- [ ] Integration with search
  - [ ] Apply to SearchDialog
  - [ ] Apply to autocomplete queries

---

### Task S.3: Implement Completion System
**Reference:** `sao/src/common.js` - `Sao.common.get_completion`

- [ ] Create shared autocomplete component
  - [ ] Text input with dropdown
  - [ ] Debounced search
  - [ ] Keyboard navigation
  - [ ] Match highlighting
- [ ] Backend integration
  - [ ] RPC call for completion results
  - [ ] Apply domain filters
  - [ ] Context-aware search
- [ ] Reuse across Many2One, One2Many, Many2Many

---

### Task S.4: Update RPC Methods
**File:** `web-client-next/src/api/rpc.js`

- [ ] Ensure all needed RPC methods exist
  - [ ] `search()` - search with domain/context
  - [ ] `name_search()` - for autocomplete
  - [ ] `create()` - create new records
  - [ ] `write()` - update records
  - [ ] `delete()` - delete records
- [ ] Add error handling
- [ ] Add loading states

---

## Testing & Validation ✅

### Task T.1: Unit Tests
- [ ] Test One2Many Add functionality
- [ ] Test One2Many New functionality
- [ ] Test Many2Many Add functionality
- [ ] Test Many2Many New functionality
- [ ] Test autocomplete behavior
- [ ] Test domain filtering
- [ ] Test permissions (read/write/create/delete access)

### Task T.2: Integration Tests
- [ ] Test full relationship workflows
- [ ] Test with different field configurations
  - [ ] With/without add_remove
  - [ ] With/without size limits
  - [ ] Different view modes
- [ ] Test SearchDialog with large datasets
- [ ] Test keyboard shortcuts

### Task T.3: Manual Testing
- [ ] Test with real Tryton models
- [ ] Test party relationships
- [ ] Test product relationships
- [ ] Compare behavior with old SAO client
- [ ] Test edge cases (empty states, errors, permissions)

---

## Documentation 📚

### Task D.1: Component Documentation
- [ ] Document SearchDialog API
- [ ] Document FormDialog API
- [ ] Document autocomplete system
- [ ] Add JSDoc comments to all new methods

### Task D.2: Migration Guide
- [ ] Document differences from SAO
- [ ] Document new React patterns used
- [ ] Document state management approach

---

## Summary Statistics

**Total Main Tasks:** 17
**Total Subtasks:** ~120
**Estimated Effort:** 4-6 weeks (1 developer)
**Priority Breakdown:**
- 🔴 High: 3 tasks (Add buttons, autocomplete)
- 🟡 Medium: 6 tasks (New/Edit functionality)
- 🟢 Low: 4 tasks (Navigation, keyboard shortcuts)
- 🔧 Infrastructure: 4 tasks (Supporting components)

---

## Next Steps

1. Start with **Phase 1, Task 1.2** - Many2Many Add button (SearchDialog)
2. Reuse SearchDialog for **Task 1.3** - One2Many Add button
3. Build FormDialog for **Phase 2** - New button functionality
4. Iterate through remaining phases

---

**Last Updated:** 2025-11-19
**Version:** 1.0
