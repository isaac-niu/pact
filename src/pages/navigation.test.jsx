import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { PactProvider } from "../store.jsx";
import App from "../App.jsx";
import Home from "./Home.jsx";
import Create from "./Create.jsx";
import Feed from "./Feed.jsx";
import PactDetail from "./PactDetail.jsx";

function renderApp(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
       <PactProvider>
         <Routes>
           <Route path="/" element={<Home />} />
           <Route path="/create" element={<Create />} />
           <Route path="/feed" element={<Feed />} />
           <Route path="/pact/:id" element={<PactDetail />} />
         </Routes>
       </PactProvider>
     </MemoryRouter>,
   );
}

describe("Navigation paths", () => {
  beforeEach(() => {
    localStorage.clear();
   });

  afterEach(() => {
    localStorage.clear();
   });

  describe("Home page navigation", () => {
    it("renders the topbar with brand and nav links on home", () => {
      renderApp("/");
      expect(screen.getByText("PACT")).toBeInTheDocument();
      expect(screen.getByText("Pitch")).toBeInTheDocument();
      expect(screen.getByText("Write slip")).toBeInTheDocument();
      expect(screen.getByText("Board")).toBeInTheDocument();
     });

    it("renders the user switcher on home", () => {
      renderApp("/");
      expect(screen.getByText("You")).toBeInTheDocument();
      expect(screen.getByText("Friend")).toBeInTheDocument();
     });

    it("navigates to /create from the nav 'Write slip' link", () => {
      renderApp("/");
      const link = screen.getByText("Write slip");
      fireEvent.click(link);
      expect(screen.getByText("Write the pact")).toBeInTheDocument();
     });

    it("navigates to /feed from the nav 'Board' link", () => {
      renderApp("/");
      const link = screen.getByText("Board");
      fireEvent.click(link);
      expect(screen.getByText("Pact board")).toBeInTheDocument();
     });

    it("navigates to / from the brand 'PACT' link", () => {
      renderApp("/create");
      const link = screen.getByText("PACT");
      fireEvent.click(link);
      expect(screen.getByText(/Bet on the/)).toBeInTheDocument();
     });
   });

  describe("Create page navigation", () => {
    it("renders the topbar on create page", () => {
      renderApp("/create");
      expect(screen.getByText("PACT")).toBeInTheDocument();
      expect(screen.getByText("Pitch")).toBeInTheDocument();
      expect(screen.getByText("Write slip")).toBeInTheDocument();
      expect(screen.getByText("Board")).toBeInTheDocument();
     });

    it("navigates to / from 'Pitch' link on create page", () => {
      renderApp("/create");
      const link = screen.getByText("Pitch");
      fireEvent.click(link);
      expect(screen.getByText(/Bet on the/)).toBeInTheDocument();
     });

    it("navigates to /feed from 'Board' link on create page", () => {
      renderApp("/create");
      const link = screen.getByText("Board");
      fireEvent.click(link);
      expect(screen.getByText("Pact board")).toBeInTheDocument();
     });
   });

  describe("Feed page navigation", () => {
    it("renders the topbar on feed page", () => {
      renderApp("/feed");
      expect(screen.getByText("PACT")).toBeInTheDocument();
      expect(screen.getByText("Pitch")).toBeInTheDocument();
      expect(screen.getByText("Write slip")).toBeInTheDocument();
      expect(screen.getByText("Board")).toBeInTheDocument();
     });

    it("navigates to / from 'Pitch' link on feed page", () => {
      renderApp("/feed");
      const link = screen.getByText("Pitch");
      fireEvent.click(link);
      expect(screen.getByText(/Bet on the/)).toBeInTheDocument();
     });

    it("navigates to /create from 'Write slip' link on feed page", () => {
      renderApp("/feed");
      const link = screen.getByText("Write slip");
      fireEvent.click(link);
      expect(screen.getByText("Write the pact")).toBeInTheDocument();
     });
   });

  describe("PactDetail page navigation", () => {
    it("renders the topbar on pact detail page", () => {
      localStorage.setItem("pact.demo.v1", JSON.stringify({
        userId: "you",
        pacts: [{
          id: "nav-pact-1",
          title: "Nav test",
          stake: 2,
          creatorId: "you",
          opponentId: "friend",
          status: "open",
          evidenceUrl: null,
          evidenceName: null,
          verdict: null,
          createdAt: Date.now(),
         }],
       }));
      renderApp("/pact/nav-pact-1");
      expect(screen.getByText("PACT")).toBeInTheDocument();
      expect(screen.getByText("Pitch")).toBeInTheDocument();
      expect(screen.getByText("Write slip")).toBeInTheDocument();
      expect(screen.getByText("Board")).toBeInTheDocument();
     });

    it("navigates to /feed from 'Back to the board' link on not-found page", () => {
      localStorage.setItem("pact.demo.v1", JSON.stringify({
        userId: "you",
        pacts: [],
       }));
      renderApp("/pact/nonexistent");
      const link = screen.getByText(/Back to the board/);
      fireEvent.click(link);
      expect(screen.getByText("Pact board")).toBeInTheDocument();
     });
   });

  describe("User switcher behavior", () => {
    it("switches from You to Friend and back", () => {
      renderApp("/");
      const friendBtn = screen.getByText("Friend");
      fireEvent.click(friendBtn);
      expect(screen.getByText(/Friend/)).toBeInTheDocument();
      const youBtn = screen.getByText("You");
      fireEvent.click(youBtn);
      expect(screen.getByText(/You/)).toBeInTheDocument();
     });

    it("user switcher affects the displayed user handle in the app", () => {
      renderApp("/");
      expect(screen.getByText("ISAAC")).toBeInTheDocument();
      const friendBtn = screen.getByText("Friend");
      fireEvent.click(friendBtn);
      expect(screen.getByText("MAYA")).toBeInTheDocument();
     });

    it("user switcher persists across page navigations", () => {
      renderApp("/");
      const friendBtn = screen.getByText("Friend");
      fireEvent.click(friendBtn);
      expect(screen.getByText("MAYA")).toBeInTheDocument();
      const boardLink = screen.getByText("Board");
      fireEvent.click(boardLink);
      expect(screen.getByText("MAYA")).toBeInTheDocument();
     });
   });

  describe("404 fallback", () => {
    it("redirects unknown routes to home", () => {
      renderApp("/nonexistent");
      expect(screen.getByText(/Bet on the/)).toBeInTheDocument();
     });
   });
});
