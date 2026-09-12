import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { PactProvider } from "../store.jsx";
import Create from "./Create.jsx";

function renderCreate(initialPath = "/create") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
       <Routes>
         <Route path="/create" element={
           <PactProvider>
             <Create />
           </PactProvider>
         } />
         <Route path="/pact/:id" element={
           <PactProvider>
             <Create />
           </PactProvider>
         } />
       </Routes>
     </MemoryRouter>,
   );
}

describe("Create page", () => {
  beforeEach(() => {
    localStorage.clear();
   });

  afterEach(() => {
    localStorage.clear();
   });

  it("renders the page head with 'New slip' kicker and 'Write the pact' heading", () => {
    renderCreate();
    expect(screen.getByText("New slip")).toBeInTheDocument();
    expect(screen.getByText("Write the pact")).toBeInTheDocument();
   });

  it("renders a challenge textarea with the default value", () => {
    renderCreate();
    const textarea = screen.getByRole("textbox", { name: /challenge/i });
    expect(textarea).toHaveValue("I'll upload a gym selfie");
   });

  it("renders a stake input with default value of 2", () => {
    renderCreate();
    const stakeInput = screen.getByRole("spinbutton", { name: /stake/i });
    expect(stakeInput).toHaveValue("2");
   });

  it("renders the hint text with user handles and pot calculation", () => {
    renderCreate();
    expect(screen.getByText(/ISAAC posts the slip/)).toBeInTheDocument();
    expect(screen.getByText(/MAYA must accept/)).toBeInTheDocument();
    expect(screen.getByText(/4.00 SOL/)).toBeInTheDocument();
   });

  it("renders the 'Post to the board' submit button", () => {
    renderCreate();
    expect(screen.getByRole("button", { name: /Post to the board/i })).toBeInTheDocument();
   });

  it("creates a pact when the form is submitted with valid data", () => {
    render(
       <MemoryRouter initialEntries={["/create"]}>
         <Routes>
           <Route path="/create" element={
             <PactProvider>
               <Create />
             </PactProvider>
           } />
           <Route path="/pact/:id" element={
             <PactProvider>
               <Create />
             </PactProvider>
           } />
         </Routes>
       </MemoryRouter>,
     );
    const submitBtn = screen.getByRole("button", { name: /Post to the board/i });
    fireEvent.click(submitBtn);
     // After submission, the user should be navigated to the pact detail page
    expect(screen.getByText(/Ticket/)).toBeInTheDocument();
   });

  it("creates a pact with a custom challenge title", () => {
    render(
       <MemoryRouter initialEntries={["/create"]}>
         <Routes>
           <Route path="/create" element={
             <PactProvider>
               <Create />
             </PactProvider>
           } />
           <Route path="/pact/:id" element={
             <PactProvider>
               <Create />
             </PactProvider>
           } />
         </Routes>
       </MemoryRouter>,
     );
    const textarea = screen.getByRole("textbox", { name: /challenge/i });
    fireEvent.change(textarea, { target: { value: "Run 5k every day" } });
    const submitBtn = screen.getByRole("button", { name: /Post to the board/i });
    fireEvent.click(submitBtn);
     // Navigate to the pact detail page to verify the pact was created
    expect(screen.getByText(/Run 5k every day/)).toBeInTheDocument();
   });

  it("creates a pact with a custom stake amount", () => {
    render(
       <MemoryRouter initialEntries={["/create"]}>
         <Routes>
           <Route path="/create" element={
             <PactProvider>
               <Create />
             </PactProvider>
           } />
           <Route path="/pact/:id" element={
             <PactProvider>
               <Create />
             </PactProvider>
           } />
         </Routes>
       </MemoryRouter>,
     );
    const stakeInput = screen.getByRole("spinbutton", { name: /stake/i });
    fireEvent.change(stakeInput, { target: { value: "5" } });
    const submitBtn = screen.getByRole("button", { name: /Post to the board/i });
    fireEvent.click(submitBtn);
    expect(screen.getByText(/10.00 SOL/)).toBeInTheDocument();
   });

  it("renders the hint with updated pot when stake changes", () => {
    renderCreate();
    const stakeInput = screen.getByRole("spinbutton", { name: /stake/i });
    fireEvent.change(stakeInput, { target: { value: "5" } });
    expect(screen.getByText(/10.00 SOL/)).toBeInTheDocument();
   });
});
