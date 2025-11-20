# Theme Customization Guide

This Tryton Web Client uses Bootstrap 5 with a customizable SCSS theme system. You can easily customize colors, spacing, and other design tokens to match your brand.

## Quick Start

All theme variables are defined in `src/styles/theme.scss`. Simply edit the color values in this file to customize your theme.

## Color Palette

### Primary Brand Colors

```scss
$primary: #0066cc;       // Main brand color (buttons, links, active states)
$secondary: #6c757d;     // Secondary/gray color
$success: #28a745;       // Success messages and actions
$info: #17a2b8;          // Informational messages
$warning: #ffc107;       // Warnings
$danger: #dc3545;        // Errors and destructive actions
```

### Component-Specific Colors

#### Sidebar
```scss
$sidebar-bg: #2c3e50;              // Sidebar background
$sidebar-color: #ecf0f1;           // Sidebar text color
$sidebar-hover-bg: #34495e;        // Hover state background
$sidebar-active-bg: $primary;      // Active menu item background
```

#### Navbar
```scss
$navbar-dark-bg: $primary;         // Top navbar background
$navbar-dark-color: #ffffff;       // Top navbar text color
```

#### Forms
```scss
$input-border-color: #ced4da;                      // Input border color
$input-focus-border-color: $primary;               // Input focus border
$input-focus-box-shadow: 0 0 0 0.2rem rgba($primary, 0.25);  // Focus shadow
```

## Example: Creating a Custom Theme

### Example 1: Dark Theme

```scss
// Dark theme color overrides
$primary: #1e90ff;
$secondary: #6c757d;
$body-bg: #1a1a1a;
$body-color: #e0e0e0;

$sidebar-bg: #0d0d0d;
$sidebar-color: #ffffff;
$sidebar-hover-bg: #2a2a2a;

$navbar-dark-bg: #0d0d0d;

$input-border-color: #404040;
$input-bg: #2a2a2a;
$input-color: #ffffff;
```

### Example 2: Corporate Blue Theme

```scss
$primary: #003d7a;        // Corporate dark blue
$secondary: #5a6e7f;      // Muted gray-blue
$success: #2e7d32;        // Professional green
$info: #0277bd;           // Info blue
$warning: #f57c00;        // Orange
$danger: #c62828;         // Dark red

$sidebar-bg: #00264d;
$sidebar-color: #e3f2fd;
$navbar-dark-bg: #003d7a;
```

### Example 3: Minimal Light Theme

```scss
$primary: #333333;
$secondary: #999999;
$body-bg: #fafafa;
$body-color: #333333;

$sidebar-bg: #ffffff;
$sidebar-color: #333333;
$sidebar-hover-bg: #f5f5f5;
$sidebar-active-bg: #eeeeee;

$navbar-dark-bg: #ffffff;
$navbar-dark-color: #333333;
```

## Advanced Customization

### Typography

```scss
$font-family-sans-serif: 'Your Font', sans-serif;
$font-size-base: 1rem;
$line-height-base: 1.5;
```

### Spacing

```scss
$spacer: 1rem;  // Base spacing unit (multiplied for margins/padding)
```

### Borders & Shadows

```scss
$border-radius: 0.25rem;
$border-color: #dee2e6;

$box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
$box-shadow-sm: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
$box-shadow-lg: 0 1rem 3rem rgba(0, 0, 0, 0.175);
```

### Buttons

```scss
$btn-border-radius: 0.25rem;
$btn-padding-y: 0.375rem;
$btn-padding-x: 0.75rem;
```

## Applying Your Changes

After editing `src/styles/theme.scss`:

1. Save the file
2. The development server will automatically reload with your new theme
3. For production builds, run `npm run build`

## Best Practices

1. **Maintain Contrast**: Ensure sufficient contrast between text and background colors for accessibility
2. **Test Thoroughly**: Check all views (forms, lists, menus) with your custom colors
3. **Use Color Variables**: Reference existing color variables (like `$primary`) instead of hard-coding colors
4. **Document Changes**: Keep track of customizations for future reference

## Color Accessibility

Use these tools to check color contrast ratios:
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Coolors Contrast Checker](https://coolors.co/contrast-checker)

Aim for:
- **WCAG AA**: Minimum contrast ratio of 4.5:1 for normal text
- **WCAG AAA**: Contrast ratio of 7:1 for enhanced accessibility

## Support

For issues or questions about theme customization, refer to:
- [Bootstrap 5 Documentation](https://getbootstrap.com/docs/5.0/customize/sass/)
- [Tryton Documentation](https://docs.tryton.org/)
