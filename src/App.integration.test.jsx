import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { setupLocalStorageMock } from "./testUtils/localStorageMock";
import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoMemoryServer } from "mongodb-memory-server";

const shouldRunIntegration = process.env.RUN_INTEGRATION === "true";
const describeIntegration = shouldRunIntegration ? describe : describe.skip;
const TEST_PORT = 5050;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "../../BACKEND");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForServer = async (url, timeoutMs = 20000) => {
  const endTime = Date.now() + timeoutMs;
  while (Date.now() < endTime) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return;
      }
    } catch {
      // retry
    }
    await delay(500);
  }
  throw new Error("Le serveur backend n'a pas démarré à temps.");
};

const registerTestUser = async (baseUrl) => {
  const email = `vitest.integration+${Date.now()}@example.com`;
  const payload = {
    email,
    password: "Vitest123!",
    name: "Vitest Integration",
  };

  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Impossible de créer l'utilisateur de test: ${response.status} ${errorBody}`
    );
  }

  const data = await response.json();
  return { token: data.token, user: data.user };
};

describeIntegration("App (intégration)", () => {
  let AppComponent;
  let backendProcess;
  let baseUrl;
  let mongoServer;

  beforeAll(async () => {
    const { default: httpAdapter } = await import("axios/lib/adapters/http.js");
    axios.defaults.adapter = httpAdapter;

    setupLocalStorageMock();
    window.localStorage.clear();

    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    baseUrl = `http://localhost:${TEST_PORT}`;

    backendProcess = spawn("node", ["server.js"], {
      cwd: backendDir,
      env: {
        ...process.env,
        PORT: TEST_PORT.toString(),
        CLIENT_URL: "http://localhost",
        MONGODB_URI: mongoUri,
        JWT_SECRET: "integration-secret",
      },
      stdio: "inherit",
    });

    await waitForServer(`${baseUrl}/health`);

    import.meta.env.VITE_API_URL = baseUrl;
    vi.resetModules();
    AppComponent = (await import("./App")).default;
  }, 60000);

  afterAll(async () => {
    if (backendProcess) {
      backendProcess.kill("SIGTERM");
      await once(backendProcess, "close").catch(() => {});
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it("crée puis supprime une tâche via l'API Express réelle", async () => {
    const { token, user } = await registerTestUser(baseUrl);
    window.localStorage.setItem("cc_token", token);
    window.localStorage.setItem("cc_user", JSON.stringify(user));

    render(<AppComponent />);

    await screen.findByText(/mes tâches/i);

    const taskTitle = `Tâche intégration ${Date.now()}`;
    const input = screen.getByPlaceholderText(/nouvelle tâche/i);
    fireEvent.change(input, { target: { value: taskTitle } });
    fireEvent.submit(input.closest("form"));

    await screen.findByText(taskTitle);

    const deleteButton = screen.getAllByRole("button", { name: /supprimer/i })[0];
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.queryByText(taskTitle)).not.toBeInTheDocument();
    });
  }, 60000);
});
