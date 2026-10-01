import { supabase } from "./supabase.js";

export function initializeAuth(onUserChange = () => {}) {
  const authPanel = document.querySelector("#auth-panel");
  const authForm = document.querySelector("#auth-form");
  const authStatus = document.querySelector("#auth-status");
  const signedInBar = document.querySelector("#signed-in-bar");
  const signedInEmail = document.querySelector("#signed-in-email");
  const signOutButton = document.querySelector("#sign-out-button");
  const protectedContent = document.querySelector("[data-auth-required]");

  function updateUser(user) {
    authPanel.hidden = Boolean(user);
    signedInBar.hidden = !user;
    protectedContent.hidden = !user;
    signedInEmail.textContent = user?.email ?? "";
    onUserChange(user);
  }

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitter = event.submitter;
    const email = authForm.elements.email.value.trim();
    const password = authForm.elements.password.value;
    const action = submitter.value;

    submitter.disabled = true;
    authStatus.textContent = "Bitte warten …";

    const result =
      action === "sign-up"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    submitter.disabled = false;

    if (result.error) {
      authStatus.textContent = result.error.message;
      return;
    }

    authStatus.textContent =
      action === "sign-up" && !result.data.session
        ? "Bitte bestätige deine E-Mail-Adresse über den zugesandten Link."
        : "Anmeldung erfolgreich.";
  });

  signOutButton.addEventListener("click", async () => {
    const { error } = await supabase.auth.signOut();
    authStatus.textContent = error ? error.message : "Du wurdest abgemeldet.";
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    updateUser(session?.user ?? null);
  });

  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      authStatus.textContent = error.message;
      return;
    }

    updateUser(data.session?.user ?? null);
  });
}
