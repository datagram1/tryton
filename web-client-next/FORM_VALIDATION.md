# Form Validation System

This document explains how our React frontend bridges Tryton's server-side validation into a seamless user experience.

## Architecture Overview

Our validation system implements the 5-step bridge strategy:

### Step A: Pull Metadata from Backend ✅

**Location:** `FormView.jsx`, `ListView.jsx`

When loading a form, we call `rpc.fieldsViewGet()` which returns:
- Field definitions (`fields` object)
- Field attributes: `required`, `readonly`, `domain`, `states`, `on_change`, etc.
- View XML with additional constraints

```javascript
const viewResult = await rpc.fieldsViewGet(modelName, viewId, 'form', sessionId, database);
// Returns: { arch: '...', fields: { name: { type: 'char', required: true, ... }, ... } }
```

###Step B: Interpret Metadata & Enforce Client-Side Constraints ✅

**Location:** `src/tryton/validation/fieldValidator.js`

The `fieldValidator` module interprets metadata and provides:

#### Field-Level Validation
```javascript
validateField(value, fieldDef, record, stateAttrs, softValidation)
```

Validates:
- **Required fields** - Checks if required fields have values
- **Type validation** - integer, float, date, datetime, email, URL, etc.
- **Digits constraint** - For numeric fields with precision requirements
- **Selection values** - Ensures value is in allowed selection list
- **Empty checks** - Type-specific empty value detection

#### Record-Level Validation
```javascript
validateRecord(record, fields, statesMap, fieldsToValidate, softValidation)
```

Validates all fields and returns:
- `{ valid: boolean, errors: {}, warnings: {} }`

#### State Computation
```javascript
computeFieldStates(statesDefinition, record)
```

Computes dynamic field states:
- **Required state** - Field becomes required based on other fields
- **Readonly state** - Field becomes readonly based on record state
- **Invisible state** - Field hidden based on conditions

Example from Tryton:
```python
# In model definition:
states = {
    'required': Eval('type') == 'invoice',
    'readonly': Eval('state') == 'done',
}
```

Our system evaluates these and applies appropriate UI states.

### Step C: Hook Change Events & Call Backend on_change ✅

**Location:** `src/hooks/useFormValidation.js`

The `useFormValidation` hook handles:

#### On-Change Integration
```javascript
const { handleFieldChange } = useFormValidation(...);

// When user changes a field:
await handleFieldChange(fieldName, value, onFieldChange);
```

This:
1. Updates the field value
2. Validates client-side
3. Calls server `on_change` if defined
4. Applies changes returned by server
5. Triggers `on_change_with` for dependent fields

#### Server Methods Called

**`on_change`** - Dynamic field updates
```javascript
// Server-side (Tryton model):
@fields.depends('partner')
def on_change_partner():
    if self.partner:
        self.address = self.partner.address

// Frontend calls:
rpc.model(modelName, 'on_change', [[record], [fieldName]], sessionId, database)
```

**`on_change_with`** - Computed field values
```javascript
// Server-side:
@fields.depends('quantity', 'unit_price')
def on_change_with_total():
    return (self.quantity or 0) * (self.unit_price or 0)

// Frontend calls:
rpc.model(modelName, 'on_change_with_total', [record], sessionId, database)
```

### Step D: Call Server pre_validate() Before Save ✅

**Location:** `useFormValidation.js` - `preValidate()` method

Before saving, we call Tryton's `pre_validate()`:

```javascript
const { preValidate } = useFormValidation(...);

// Before save:
const validation = await preValidate();
if (!validation.valid) {
    // Show errors, don't save
    return;
}

// Proceed with save
await rpc.write(modelName, [recordId], data, sessionId, database);
```

**Server-side (Tryton model):**
```python
@classmethod
def pre_validate(cls, records):
    """Called by client to validate records before save"""
    for record in records:
        if record.amount < 0:
            raise UserError("Amount must be positive")
        if record.date > datetime.now():
            raise UserWarning("Future date selected")
```

The frontend catches these exceptions and displays them as validation errors.

### Step E: Visual Feedback with Bootstrap 5 ✅

**Location:** Form rendering components

The validation system integrates with Bootstrap 5 form classes:

```javascript
const { getFieldValidationProps } = useFormValidation(...);

// For each field:
const validationProps = getFieldValidationProps(fieldName);

<Form.Group>
    <Form.Label className={validationProps.required ? 'required' : ''}>
        {fieldDef.string}
        {validationProps.required && <span className="text-danger">*</span>}
    </Form.Label>

    <Form.Control
        className={validationProps.className}  // 'is-invalid' or ''
        isInvalid={validationProps.isInvalid}
        isValid={validationProps.isValid}
        readOnly={validationProps.readonly}
        disabled={validationProps.readonly}
    />

    {validationProps.error && (
        <Form.Control.Feedback type="invalid">
            {validationProps.error}
        </Form.Control.Feedback>
    )}

    {validationProps.warning && (
        <Alert variant="warning" className="mt-2">
            {validationProps.warning}
        </Alert>
    )}
</Form.Group>
```

**CSS Classes Applied:**
- `.required` - Red asterisk or border for required fields
- `.is-invalid` - Red border + error message for invalid fields
- `.is-valid` - Green border for valid fields (optional)
- `.readonly` / `[readonly]` - Grayed out for readonly fields

## Usage Example

### In FormView Component:

```javascript
import { useFormValidation } from '../hooks/useFormValidation';

function FormView({ modelName, recordId }) {
    const [recordData, setRecordData] = useState({});
    const [fields, setFields] = useState({});

    const {
        validationErrors,
        fieldStates,
        isValidating,
        hasErrors,
        handleFieldChange,
        preValidate,
        getFieldValidationProps,
    } = useFormValidation(modelName, fields, recordData, sessionId, database);

    const handleSave = async () => {
        // Client-side validation
        const clientValidation = validateAll();
        if (!clientValidation.valid) {
            alert('Please fix validation errors');
            return;
        }

        // Server-side pre-validation
        const serverValidation = await preValidate();
        if (!serverValidation.valid) {
            // Errors already set in state, UI will show them
            return;
        }

        // All validation passed, proceed with save
        await rpc.write(modelName, [recordId], recordData, sessionId, database);
    };

    return (
        <Form>
            {Object.keys(fields).map(fieldName => {
                const fieldDef = fields[fieldName];
                const validationProps = getFieldValidationProps(fieldName);

                return (
                    <FormField
                        key={fieldName}
                        fieldName={fieldName}
                        fieldDef={fieldDef}
                        value={recordData[fieldName]}
                        onChange={(value) =>
                            handleFieldChange(fieldName, value, setRecordData)
                        }
                        {...validationProps}
                    />
                );
            })}

            <Button onClick={handleSave} disabled={hasErrors || isValidating}>
                {isValidating ? 'Validating...' : 'Save'}
            </Button>
        </Form>
    );
}
```

## Validation Flow Diagram

```
User Types in Field
        ↓
handleFieldChange()
        ↓
┌───────────────────────────────┐
│ 1. Update field value         │
│ 2. Client-side validation     │
│ 3. Call on_change (if defined)│
│ 4. Apply server changes       │
│ 5. Update dependent fields    │
└───────────────────────────────┘
        ↓
UI Updates with Validation State
        ↓
User Clicks Save
        ↓
preValidate() - Server Call
        ↓
┌─────────────────────┐
│ Validation Passes?  │
└─────────────────────┘
    YES ↓         NO ↓
    Save      Show Errors
```

## Server-Side Error Format

Tryton returns errors in this format:

```javascript
{
    error: [
        'UserError',         // Error type
        'Invalid value',     // Error message
        'Details here'       // Error description (optional)
    ]
}
```

Our system parses this and displays it appropriately.

## Future Enhancements

1. **Full PYSON Support** - Currently we do simple state evaluation. Full production needs the PYSON parser from SAO.

2. **Domain Validation** - Complex domain constraints need server-side validation. We mark fields as `needsServerValidation` for this.

3. **Async Validation Indicators** - Show loading spinner while on_change is executing.

4. **Validation Debouncing** - Debounce rapid field changes to avoid excessive on_change calls.

5. **Field Dependencies** - Track field dependencies more explicitly for optimal on_change triggering.

## Testing

To test validation:

1. **Required Fields:**
   - Leave a required field empty → Should show error on blur/save
   - Fill it → Error should clear

2. **Type Validation:**
   - Enter text in integer field → Should show type error
   - Enter invalid email → Should show format error

3. **On-Change:**
   - Change partner field → Address should auto-update
   - Change quantity/price → Total should recalculate

4. **Pre-Validate:**
   - Enter invalid data → Save should be blocked
   - Fix data → Save should work

5. **States:**
   - Change field that triggers readonly → Other field becomes readonly
   - Change field that triggers required → Other field shows required indicator

## References

- Tryton Model Docs: https://docs.tryton.org/
- SAO Validation: `/Users/richardbrown/github/tryton/sao/src/model.js`
- Field States: Tryton view XML specification
