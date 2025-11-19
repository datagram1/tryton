# **Project Plan: Tryton Web Client Modernization (React \+ Bootstrap 5\)**

Objective: Create a modern front-end for Tryton ERP using React and Bootstrap 5 that runs alongside the legacy sao client.  
Strategy: "Metadata Engine" \- The client will fetch existing XML views from the server and render them programmatically using a recursive React component, avoiding manual recreation of forms.  
Stack: React, Vite, React-Bootstrap (Bootstrap 5), Zustand (State), fast-xml-parser.

## **Phase 1: Project Scaffolding & Environment**

*Goal: Establish the development environment in the Tryton root and ensure the new frontend can talk to the legacy backend.*

* \[x\] **Initialize React Project**
  * **Location:** Create the project at the repository root (sibling to sao, trytond, and modules).
  * Command: npm create vite@latest web-client-next \-- \--template react
  * Install Core Dependencies: npm install react-bootstrap bootstrap sass axios zustand fast-xml-parser
  * Install Icons: npm install react-icons (for UI) and bootstrap-icons.
* \[x\] **Environment Configuration (.env)**
  * Create a .env.local file in web-client-next/ to store sensitive connection details.
  * **Variables to Add:**
    * VITE\_TRYTON\_DB\_HOST=192.168.10.15
    * VITE\_TRYTON\_DB\_USER=keynetworks
    * VITE\_TRYTON\_DB\_PASSWORD=K3yn3tw0rk5 (Note: mostly for server config, but good to reference)
    * VITE\_DEV\_DEFAULT\_LOGIN=keynetworks (To pre-fill login form)
  * *Note:* Ensure .env.local is added to .gitignore.
* \[x\] **Version Control Setup**
  * *Note:* Tryton uses Mercurial (hg).
  * Edit .hgignore (or .gitignore) in the root directory.
  * Add: glob:web-client-next/node\_modules, glob:web-client-next/dist, and glob:web-client-next/.env.local.
* \[x\] **Configure Vite Proxy**
  * Edit web-client-next/vite.config.js.
  * Set up a proxy rule for /trytond (or root /) to forward requests to http://localhost:8000 (standard trytond port).
  * **Crucial:** Ensure the proxy also handles icon requests (typically /trytond/model/ir.ui.icon/...) so module icons defined in modules/\*/icons load correctly.
  * *Success Criteria:* fetch('/trytond/') from the browser console returns a 404 or Tryton response, not a CORS error.
* \[x\] **Project Structure Setup**
  * Create directory: src/api (RPC and Connection logic)
  * Create directory: src/components (Generic UI components)
  * Create directory: src/tryton (The Core Engine)
    * src/tryton/registry (Widget mapping)
    * src/tryton/renderer (Recursive View components)
    * src/tryton/parsers (XML and Domain parsers)
  * Create directory: src/store (State management)

## **Phase 2: Core Communication (RPC & Auth)**

*Goal: Authenticate with the server and maintain a session.*

* \[x\] **Implement RPC Client (src/api/rpc.js)**
  * Create a generic call(method, params, session\_id) function.
  * Construct the JSON-RPC 2.0 payload.
  * Handle standard Tryton errors (ConcurrencyException, UserError).
* \[x\] **Global State Store (src/store/session.js)**
  * Create a Zustand store to hold:
    * sessionId (token)
    * userId
    * context (Dictionary: company, language, etc.)
  * Implement login(db, user, password) action.
  * Implement logout() action.
* \[x\] **Login View**
  * Create a Bootstrap 5 centered Card component.
  * Form: Database (optional/hardcoded for dev), Username, Password.
  * **Dev Feature:** Use import.meta.env.VITE\_DEV\_DEFAULT\_LOGIN to pre-fill the username field for faster testing.
  * On Submit: Call common.db.login via RPC.
  * *Success Criteria:* Upon login, store the sessionId and redirect to a Dashboard placeholder.

## **Phase 3: The Navigation Shell (Main Frame)**

*Goal: Display the application shell and load the main menu.*

* \[x\] **Fetch Application Menu**
  * RPC Call: model.ir.ui.menu.search\_read (fetch top-level menus).
  * Build a recursive function to organize the flat list into a tree structure (Parent/Child).
* \[x\] **Sidebar / App Bar Component**
  * Render the Menu Tree using react-bootstrap Accordions or Navs.
  * **Icon Handling:** Map the icon field from the menu response to an \<img\> tag pointed at the proxy URL (e.g., /trytond/params... or simply use default UI icons for now).
  * Add click handlers: When a leaf node (Action) is clicked, it should retrieve the action\_id.
* \[x\] **Tab Manager (MDI \- Multiple Document Interface)**
  * Create src/store/tabs.js to manage open tabs.
  * Create a MainLayout component with a top Navbar (User profile, preferences) and a main content area.
  * Implement a tab bar to switch between open views (e.g., "Parties", "Invoices").

## **Phase 4: The View Engine (The "Heart")**

*Goal: Download an XML view and parse it into a renderable JSON object.*

* \[x\] **View Fetcher**
  * Implement logic to fetch the view definition given a model and view\_id.
  * RPC Method: model.\[ModelName\].fields\_view\_get.
  * This returns: { type: 'form', fields: {...}, arch: '\<xml\>...' }.
* \[x\] **XML Parser (src/tryton/parsers/xml.js)**
  * Use fast-xml-parser to convert the arch string into a JSON Object.
  * Ensure attributes (like colspan, col, name, string) are preserved.
* \[x\] **The Recursive Renderer (TrytonViewRenderer.jsx)**
  * **Base Component:** Accepts node (the current XML node), record (data), and fields (metadata).
  * **Conditional Rendering Logic:**
    * If node.tag \=== 'group': Render \<Row\>. Recursively render children inside.
    * If node.tag \=== 'notebook': Render \<Tabs\>.
    * If node.tag \=== 'page': Render \<Tab\>.
    * If node.tag \=== 'separator': Render \<hr\> or Section Title.
    * If node.tag \=== 'field': Look up the widget in the Registry (Phase 5).

## **Phase 5: The Widget Registry**

*Goal: Map Tryton data types to Bootstrap 5 components.*

* \[x\] **Registry Infrastructure**
  * Create src/tryton/registry/index.js.
  * Export a dictionary mapping Tryton types (char, integer, date) to React Components.
* \[x\] **Basic Field Widgets**
  * **Char/String:** Form.Control type="text".
  * **Integer/Float:** Form.Control type="number".
  * **Boolean:** Form.Check type="checkbox".
  * **Date/DateTime:** Native \<input type="date"\>. *Note: Requires value marshalling (converting JS Date to Tryton 'YYYY-MM-DD' string).*
  * **Selection:** Form.Select. Populate \<option\> from the field's selection attribute in metadata.
* \[x\] **Layout Widgets**
  * **Label:** Handle \<label name="xyz"/\> tags.
  * **Readonly Mode:** Ensure all widgets accept a readonly prop that renders text instead of inputs.

## **Phase 6: Data Binding & Interaction**

*Goal: Load real data into the forms and handle user input.*

* \[ \] **Form View Container**  
  * Create a wrapper component FormView that manages the state of a single record.  
  * RPC Call: model.\[ModelName\].read to get data for a specific ID.  
  * State: recordData (object).  
* \[ \] **Handling onChange**  
  * Implement the "On Change" handler.  
  * *Note:* In Tryton, changing a field often triggers a server call (on\_change\_\[field\]) to update other fields.  
  * Create logic: When generic input changes \-\> update local state \-\> debounce \-\> call server on\_change \-\> update local state with result.  
* \[ \] **Save / Write**  
  * Implement "Save" button in the toolbar.  
  * If ID exists: RPC model.write.  
  * If ID is new: RPC model.create.

## **Phase 7: Complex Widgets (Advanced)**

*These are the hardest parts and should be tackled after the basics work.*

* \[ \] **Many2One Widget (The Lookup)**  
  * Needs an Autocomplete/Combobox.  
  * On type: RPC model.\[TargetModel\].search.  
  * On select: Store the ID.  
* \[ \] **One2Many / Many2Many Widget (The Grid)**  
  * Requires a Data Grid component (recommend @tanstack/react-table or a simple Bootstrap Table to start).  
  * Needs to fetch the list of related IDs.  
  * Needs to render a nested TreeView (List view) inside the Form.  
* \[ \] **Action Handling**  
  * Handle \<button name="action\_..." /\>.  
  * Logic to trigger Server Actions, Reports, or Wizards (Popups).