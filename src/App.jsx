// src/App.jsx
import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://YOUR_BACKEND_URL"; // ← à adapter

function App() {
  const [authMode, setAuthMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [taskError, setTaskError] = useState("");

  // Charger token + user depuis localStorage au démarrage
  useEffect(() => {
    const storedToken = localStorage.getItem("cc_token");
    const storedUser = localStorage.getItem("cc_user");
    if (storedToken) {
      setToken(storedToken);
    }
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // ignore
      }
    }
  }, []);

  // Quand on a un token → charger les tâches
  useEffect(() => {
    if (!token) return;
    fetchTasks();
  }, [token]);

  // Helper axios avec header Authorization
  const api = axios.create({
    baseURL: API_BASE_URL,
  });

  api.interceptors.request.use((config) => {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // ------- AUTH ---------

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/register`, {
        email,
        password,
        name,
      });

      const { token: jwt, user: userData } = res.data;
      setToken(jwt);
      setUser(userData);
      localStorage.setItem("cc_token", jwt);
      localStorage.setItem("cc_user", JSON.stringify(userData));

      // Reset form
      setPassword("");
      setName("");

      // Charger les tâches éventuelles (normalement vide au début)
      fetchTasks(jwt);
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.error || "Inscription impossible. Réessaie.";
      setAuthError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password,
      });

      const { token: jwt, user: userData } = res.data;
      setToken(jwt);
      setUser(userData);
      localStorage.setItem("cc_token", jwt);
      localStorage.setItem("cc_user", JSON.stringify(userData));

      setPassword("");
      fetchTasks(jwt);
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.error || "Connexion impossible. Réessaie.";
      setAuthError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setTasks([]);
    localStorage.removeItem("cc_token");
    localStorage.removeItem("cc_user");
  };

  // ------- TÂCHES ---------

  const fetchTasks = async (overrideToken) => {
    setTaskError("");
    try {
      const res = await axios.get(`${API_BASE_URL}/api/tasks`, {
        headers: {
          Authorization: `Bearer ${overrideToken || token}`,
        },
      });
      setTasks(res.data);
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.error ||
        "Impossible de charger les tâches. Vérifie la connexion.";
      setTaskError(msg);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setTaskError("");
    try {
      const res = await api.post("/api/tasks", {
        title: newTaskTitle.trim(),
      });
      setTasks((prev) => [res.data, ...prev]);
      setNewTaskTitle("");
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.error || "Impossible d'ajouter la tâche.";
      setTaskError(msg);
    }
  };

  const handleDeleteTask = async (taskId) => {
    setTaskError("");
    try {
      await api.delete(`/api/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.error || "Impossible de supprimer la tâche.";
      setTaskError(msg);
    }
  };

  // ------- RENDU UI ---------

  const renderAuthForm = () => (
    <div className="card shadow-sm">
      <div className="card-body">
        <h2 className="card-title h4 mb-3">
          {authMode === "login" ? "Connexion" : "Inscription"}
        </h2>

        {authError && (
          <div className="alert alert-danger py-2">{authError}</div>
        )}

        <form onSubmit={authMode === "login" ? handleLogin : handleRegister}>
          {authMode === "register" && (
            <div className="mb-3">
              <label className="form-label">Nom</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={authMode === "register"}
              />
            </div>
          )}

          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Mot de passe</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={loading}
          >
            {loading
              ? "Chargement..."
              : authMode === "login"
              ? "Se connecter"
              : "Créer un compte"}
          </button>
        </form>

        <hr className="my-4" />

        {authMode === "login" ? (
          <p className="mb-0 text-center">
            Pas de compte ?{" "}
            <button
              type="button"
              className="btn btn-link p-0 align-baseline"
              onClick={() => {
                setAuthMode("register");
                setAuthError("");
              }}
            >
              Inscription
            </button>
          </p>
        ) : (
          <p className="mb-0 text-center">
            Déjà inscrit ?{" "}
            <button
              type="button"
              className="btn btn-link p-0 align-baseline"
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
              }}
            >
              Connexion
            </button>
          </p>
        )}
      </div>
    </div>
  );

  const renderTasks = () => (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h2 className="card-title h4 mb-0">Mes tâches</h2>
            <small className="text-muted">
              Connecté en tant que {user?.email}
            </small>
          </div>
          <button className="btn btn-outline-secondary btn-sm" onClick={handleLogout}>
            Se déconnecter
          </button>
        </div>

        {taskError && (
          <div className="alert alert-danger py-2">{taskError}</div>
        )}

        <form className="input-group mb-3" onSubmit={handleAddTask}>
          <input
            type="text"
            className="form-control"
            placeholder="Nouvelle tâche..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
          />
          <button type="submit" className="btn btn-success">
            Ajouter
          </button>
        </form>

        {tasks.length === 0 ? (
          <p className="text-muted">Aucune tâche pour l’instant.</p>
        ) : (
          <ul className="list-group">
            {tasks.map((task) => (
              <li
                key={task._id}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <span>{task.title}</span>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => handleDeleteTask(task._id)}
                >
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-vh-100 d-flex align-items-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="text-center mb-4">
              <h1 className="h3">Cloud Campus – Todo App</h1>
              <p className="text-muted mb-0">
                Backend : Docker + MongoDB Atlas + JWT
              </p>
            </div>

            {!token ? renderAuthForm() : renderTasks()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
