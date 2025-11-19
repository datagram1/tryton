# Tryton Web Client (React)

A modern web client for Tryton ERP built with React, Vite, and Bootstrap 5.

## Features

- ✅ **Challenge-Response Authentication** - Secure login with Argon2 password hashing
- ✅ **JSON-RPC 2.0 Protocol** - Full RPC client implementation
- ✅ **Session Management** - Zustand-based state management
- ✅ **Responsive UI** - Bootstrap 5 with collapsible sidebar
- ✅ **Tab-based Interface** - Multi-view support with tab management
- ✅ **Menu System** - Dynamic menu loading from Tryton server
- ✅ **View Rendering** - XML view parser and renderer (in progress)

## Prerequisites

- **Node.js** 18+ and npm
- **Tryton Server** running on `http://localhost:8001`
- A Tryton database with at least one user account

## Backend Setup (Tryton Server)

If you don't have a Tryton server running, you'll need to set one up first:

### 1. Install Tryton Server

```bash
# Create a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install trytond
pip install trytond

# Install required modules
pip install trytond_party trytond_company trytond_product trytond_currency
```

### 2. Configure Tryton

Create a `trytond.conf` file:

```ini
[web]
listen = 0.0.0.0:8001
root = /

[database]
uri = postgresql://localhost:5432
path = /path/to/tryton/db

[session]
authentications = password
```

### 3. Initialize Database

```bash
# Create database
trytond-admin -c trytond.conf -d tryton --all

# Set admin password (use Argon2)
# Connect to PostgreSQL and run:
# UPDATE res_user
# SET password_hash = '$argon2id$v=19$m=102400,t=4,p=8$...'
# WHERE login = 'admin';
```

### 4. Start Tryton Server

```bash
trytond -c trytond.conf
```

The server should now be running on `http://localhost:8001`.

## Frontend Setup

### 1. Clone the Repository

```bash
git clone https://github.com/datagram1/tryton.git
cd tryton
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure the Application

The application is pre-configured to connect to `http://localhost:8001`. If your Tryton server is running on a different port, update `vite.config.js`:

```javascript
export default defineConfig({
  // ...
  server: {
    proxy: {
      '/tryton/': {
        target: 'http://localhost:8001', // Change this to your Tryton server URL
        changeOrigin: true,
        secure: false,
        // ...
      },
    },
  },
})
```

### 4. Start Development Server

```bash
npm run dev
```

The application will start on `http://localhost:5173` (or the next available port).

### 5. Login

Open your browser to `http://localhost:5173` and login with:

- **Database**: `tryton` (or your database name)
- **Username**: `admin`
- **Password**: Your admin password

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Project Structure

```
tryton/
├── src/
│   ├── api/              # RPC client and API helpers
│   │   ├── rpc.js        # JSON-RPC 2.0 client
│   │   ├── menu.js       # Menu API
│   │   └── views.js      # View API
│   ├── components/       # React components
│   │   ├── Login.jsx     # Login form
│   │   ├── MainLayout.jsx # Main app layout
│   │   ├── Sidebar.jsx   # Navigation sidebar
│   │   └── TabManager.jsx # Tab-based view manager
│   ├── store/            # Zustand state stores
│   │   ├── session.js    # Authentication state
│   │   ├── menu.js       # Menu state
│   │   └── tabs.js       # Tab state
│   ├── tryton/           # Tryton-specific utilities
│   │   ├── parsers/      # XML and view parsers
│   │   └── renderer/     # View renderers
│   ├── App.jsx           # Root component
│   └── main.jsx          # Application entry point
├── vite.config.js        # Vite configuration
└── package.json          # Dependencies and scripts
```

## Dependencies

### Runtime Dependencies
- **react** 19.2.0 - UI framework
- **react-dom** 19.2.0 - React DOM renderer
- **axios** 1.13.2 - HTTP client for RPC calls
- **zustand** 5.0.8 - State management
- **bootstrap** 5.3.8 - UI framework
- **react-bootstrap** 2.10.10 - React Bootstrap components
- **bootstrap-icons** 1.13.1 - Icon library
- **react-icons** 5.5.0 - Additional icons
- **fast-xml-parser** 5.3.2 - XML parser for Tryton views
- **sass** 1.94.1 - CSS preprocessor

### Development Dependencies
- **vite** 7.2.2 - Build tool and dev server
- **@vitejs/plugin-react** 5.1.0 - React plugin for Vite
- **eslint** 9.39.1 - Code linting

## Configuration

### Environment Variables

Create a `.env` file for development defaults:

```env
# Default login (development only)
VITE_DEV_DEFAULT_LOGIN=admin
```

### Vite Proxy Configuration

The Vite dev server proxies requests to `/tryton/` to the Tryton backend. This is configured in `vite.config.js` and handles:
- CORS headers
- Origin header stripping (required for Tryton compatibility)
- Request forwarding to backend

## Troubleshooting

### Login Returns 500 Error

This usually means the Vite proxy isn't properly forwarding requests. Check:
1. Tryton server is running on `http://localhost:8001`
2. Database name is correct
3. User credentials are valid

### Cannot Connect to Server

1. Verify Tryton server is running: `curl http://localhost:8001/`
2. Check `vite.config.js` proxy target matches your server URL
3. Ensure no other services are using port 8001

### Build Issues

If you encounter build errors:
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Development Roadmap

- [ ] Complete view rendering for all Tryton view types
- [ ] Implement form views with field widgets
- [ ] Add tree/list views
- [ ] Calendar and graph views
- [ ] Search and filter functionality
- [ ] Keyboard shortcuts
- [ ] Localization/i18n
- [ ] Production build optimization
- [ ] Docker deployment

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Built for the [Tryton ERP](https://www.tryton.org/) ecosystem
- Inspired by the official Sao web client
- Uses challenge-response authentication for security
