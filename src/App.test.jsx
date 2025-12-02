import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { setupLocalStorageMock } from "./testUtils/localStorageMock";

describe("App", () => {
  let apiClientMock;

  beforeEach(() => {
    vi.restoreAllMocks();

    apiClientMock = {
      post: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
      },
    };

    vi.spyOn(axios, "create").mockReturnValue(apiClientMock);
    vi.spyOn(axios, "get");

    setupLocalStorageMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("affiche le formulaire de connexion par défaut", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /cloud campus – todo app/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /se connecter/i })
    ).toBeInTheDocument();
  });

  it("permet de basculer vers le mode inscription puis retour connexion", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /inscription/i }));
    expect(
      screen.getByRole("heading", { name: /inscription/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /créer un compte/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /connexion/i }));
    expect(
      screen.getByRole("button", { name: /se connecter/i })
    ).toBeInTheDocument();
  });

  it("permet d'ajouter puis supprimer une tâche", async () => {
    axios.get.mockResolvedValueOnce({ data: [] });

    window.localStorage.setItem("cc_token", "test-token");
    window.localStorage.setItem(
      "cc_user",
      JSON.stringify({ email: "demo@test.com" })
    );

    render(<App />);

    await screen.findByText(/mes tâches/i);

    const input = screen.getByPlaceholderText(/nouvelle tâche/i);
    fireEvent.change(input, { target: { value: "Nouvelle tâche" } });

    apiClientMock.post.mockResolvedValueOnce({
      data: { _id: "task-1", title: "Nouvelle tâche" },
    });

    fireEvent.submit(input.closest("form"));

    await screen.findByText("Nouvelle tâche");

    apiClientMock.delete.mockResolvedValueOnce({});
    fireEvent.click(screen.getByRole("button", { name: /supprimer/i }));

    await waitFor(() => {
      expect(screen.queryByText("Nouvelle tâche")).not.toBeInTheDocument();
    });
  });
});
