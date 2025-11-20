######
Tryton
######

Tryton is business software, ideal for companies of any size, easy to use,
complete and 100% Open Source.

This repository contains the source for all the packages of Tryton **plus a modern React-based web client** (``web-client-next/``).

***********************
React Web Client (NEW)
***********************

A modern, feature-rich React + Bootstrap 5 web client for Tryton ERP, designed to replace the jQuery-based SAO client with improved performance, maintainability, and user experience.

Features
========

**View Types (100% Complete)**

* **Form View** - Full CRUD operations with validation
* **List/Tree View** - Sortable, filterable, with inline editing
* **Calendar View** - Month/Week/Day/Agenda with drag & drop
* **Graph View** - Interactive charts (Bar, Line, Pie) with drill-down
* **Board View** - Dashboard with action panels
* **List-Form View** - Mobile-friendly card layout
* **Gantt View** - Timeline visualization (framework ready)

**Field Widgets (20+ Types)**

* Text fields: Char, Text, Password, Email, URL, CallTo
* Numeric: Integer, Float, Numeric (arbitrary precision)
* Date/Time: Date, DateTime, Time, TimeDelta
* Selection: Selection, MultiSelection
* Relational: Many2One, One2Many, Many2Many, One2One, Reference
* Binary: Binary, Image, Document (with preview)
* Special: Boolean, Color, HTML, ProgressBar

**Advanced Features**

* **Import/Export System** - CSV import/export with field mapping and saved configurations
* **Attachment Manager** - Upload, download, delete attachments with drag & drop
* **Note System** - Add/edit/delete notes with read/unread tracking
* **Wizard System** - Multi-state workflow support
* **Search & Filtering** - Full-text search with domain parser
* **Keyboard Shortcuts** - Full keyboard navigation (F1 for help)
* **User Preferences** - Theme customization, dark mode, locale settings
* **Inline Editing** - Direct cell editing in list views
* **Drag & Drop** - Row reordering, file uploads
* **Column Management** - Resize, hide/show, aggregation footer
* **Context Menus** - Right-click actions on rows

Quick Start
===========

1. **Backend Setup**

   .. code-block:: console

      cd /Users/richardbrown/dev/tryton
      source .venv/bin/activate
      trytond -c trytond.conf

2. **Frontend Setup**

   .. code-block:: console

      cd web-client-next
      npm install
      npm run dev

3. **Access**

   * Backend API: http://localhost:8001
   * React Client: http://localhost:5173
   * Login: admin / admin (demo database)

Documentation
=============

* ``web-client-next/README.md`` - Frontend documentation
* ``web-client-next/IMPLEMENTATION_SUMMARY.md`` - Technical overview
* ``todo/tasks2.md`` - Feature parity roadmap

Technology Stack
================

* **Frontend**: React 18, Bootstrap 5, Vite
* **State Management**: Zustand
* **Routing**: React Router
* **Charts**: Recharts
* **Calendar**: React Big Calendar
* **Tables**: TanStack Table
* **Icons**: React Icons

***********************
Original Tryton Setup
***********************

This repository contains the source for all the packages of Tryton.

Setup
=====

It is recommended to isolate the development within a Python `virtual
environment <https://docs.python.org/tutorial/venv.html>`_.

From the root directory of the repository run:

.. code-block:: console

   .hooks/update_requirements
   .hooks/link_modules

.. warning::

   The process of updating requirements files may take some time.

Install the dependencies with:

.. code-block:: console

   pip install -e trytond -e tryton -e proteus -r requirements.txt -r requirements-dev.txt

Automate
========

To automate the process, add the following lines to the ``[hooks]`` section of
the ``.hg/hgrc``:

.. code-block:: ini

   [hooks]
   update.modules = .hooks/link_modules
   update.requirements = .hooks/update_requirements

On ``hg update``, the first hook will automatically create symlinks for modules
and the second hook will automatically generate requirements files.

Submit Change
=============

For information about how to submit change, please read on and follow the
`guidelines <https://www.tryton.org/develop>`_.
