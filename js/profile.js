import { supabase } from "./supabase.js";

const profileForm = document.querySelector("#profile-form");
const profileName = document.querySelector("#profile-name");
const employeeName = document.querySelector("#preferred-employee-name");
const profileStatus = document.querySelector("#profile-status");
const deleteDialog = document.querySelector("#delete-account-dialog");
const deleteForm = document.querySelector("#delete-account-form");
const deleteConfirmation = document.querySelector("#delete-account-confirmation");
const deleteStatus = document.querySelector("#delete-account-status");
const deleteButton = document.querySelector("#delete-account-button");

export function initializeProfile(user) {
  if (!user || !profileForm) return;

  const metadata = user.user_metadata ?? {};
  const suggestedName = suggestName(user.email ?? "");

  profileName.value = metadata.full_name ?? "";
  employeeName.value = metadata.employee_name ?? metadata.full_name ?? suggestedName;
}

function suggestName(email) {
  const localPart = email.split("@")[0]?.split("+")[0] ?? "";

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0).toLocaleUpperCase("de-CH") +
        part.slice(1).toLocaleLowerCase("de-CH"),
    )
    .join(" ");
}

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = profileForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  profileStatus.textContent = "Profil wird gespeichert …";

  const { data, error } = await supabase.auth.updateUser({
    data: {
      full_name: profileName.value.trim(),
      employee_name: employeeName.value.trim(),
    },
  });

  submitButton.disabled = false;

  if (error) {
    profileStatus.textContent = `Profil konnte nicht gespeichert werden: ${error.message}`;
    return;
  }

  profileStatus.textContent = "Profil und Namensvorschlag wurden gespeichert.";
  window.dispatchEvent(
    new CustomEvent("profile-updated", { detail: data.user.user_metadata }),
  );
});

deleteButton.addEventListener("click", () => {
  deleteConfirmation.value = "";
  deleteStatus.textContent = "";
  deleteDialog.showModal();
});

document.querySelector("#cancel-delete-account").addEventListener("click", () => {
  deleteDialog.close();
});

deleteForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (deleteConfirmation.value !== "LÖSCHEN") {
    deleteStatus.textContent = "Bitte tippe zur Bestätigung genau LÖSCHEN ein.";
    return;
  }

  const submitButton = deleteForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  deleteButton.disabled = true;
  deleteStatus.textContent = "Konto und Arbeitszeiten werden gelöscht …";

  const { error } = await supabase.functions.invoke("delete-account");

  if (error) {
    submitButton.disabled = false;
    deleteButton.disabled = false;
    deleteStatus.textContent = `Das Konto konnte nicht gelöscht werden: ${error.message}`;
    return;
  }

  const { error: signOutError } = await supabase.auth.signOut({
    scope: "local",
  });
  if (signOutError) {
    submitButton.disabled = false;
    deleteButton.disabled = false;
    deleteStatus.textContent = `Konto wurde gelöscht, lokale Abmeldung fehlgeschlagen: ${signOutError.message}. Bitte lade die Seite neu.`;
    return;
  }

  deleteDialog.close();
  window.location.assign("index.html");
});

deleteDialog.addEventListener("click", (event) => {
  if (event.target === deleteDialog) deleteDialog.close();
});
