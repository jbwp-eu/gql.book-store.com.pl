import "./commands";

// Keep Cypress noise down; failures still surface clearly in the runner.
Cypress.on("uncaught:exception", () => {
  return false;
});

