import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import useSessionStore from '../store/session';

/**
 * Login Component
 * Provides authentication interface for Tryton
 */
function Login({ onLoginSuccess }) {
  const [database, setDatabase] = useState('tryton');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');

  const { login, isLoading, error, clearError } = useSessionStore();

  // Clear error when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Use hardcoded database for development if not provided
    const dbName = database || 'tryton';

    const success = await login(dbName, username, password);

    if (success) {
      // Clear password from memory
      setPassword('');

      // Call success callback if provided
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    }
  };

  return (
    <Container fluid className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <Row className="w-100">
        <Col xs={12} sm={8} md={6} lg={4} xl={3} className="mx-auto">
          <Card className="shadow">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <h2 className="fw-bold text-primary mb-0">Tryton</h2>
              </div>

              {error && (
                <Alert variant="danger" dismissible onClose={clearError} className="mb-3">
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="database">
                  <Form.Label className="small">Database</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="tryton"
                    value={database}
                    onChange={(e) => setDatabase(e.target.value)}
                    disabled={isLoading}
                    size="sm"
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="username">
                  <Form.Label>User</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus={!username}
                    disabled={isLoading}
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="password">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus={!!username}
                    disabled={isLoading}
                  />
                </Form.Group>

                <Button
                  variant="primary"
                  type="submit"
                  className="w-100 mt-3"
                  disabled={isLoading || !username || !password}
                >
                  {isLoading ? 'Logging in...' : 'Login'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Login;
