import { supabase } from "./supabase.js";
import { initializeAuth } from "./auth.js";

const recordsBody = document.querySelector("#records-body");
const recordsMessage = document.querySelector("#records-message");
const refreshButton = document.querySelector("#refresh-records");
let currentUser = null;

function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes === 0 ? `${hours} Std.` : `${hours} Std. ${minutes} Min.`;
}

async function loadRecords() {
  if (!currentUser) return;

  refreshButton.disabled = true;
  recordsMessage.textContent = "Lade Einträge …";
  recordsBody.replaceChildren();

  const { data, error } = await supabase
    .from("work_entries")
    .select(
      "id, work_date, work_start, work_end, break_minutes, effective_minutes",
    )
    .eq("user_id", currentUser.id)
    .order("work_date", { ascending: false });

  refreshButton.disabled = false;

  if (error) {
    recordsMessage.textContent =
      "Die Einträge konnten nicht geladen werden. Bitte prüfe die Datenbankeinrichtung.";
    return;
  }

  if (data.length === 0) {
    recordsMessage.textContent = "Du hast noch keine Arbeitszeiten erfasst.";
    return;
  }

  const rows = data.map((entry) => {
    const row = document.createElement("tr");
    const cells = [
      new Date(`${entry.work_date}T00:00:00`).toLocaleDateString("de-DE"),
      entry.work_start.slice(0, 5),
      entry.work_end.slice(0, 5),
      `${entry.break_minutes} Min.`,
      formatDuration(entry.effective_minutes),
    ];

    for (const value of cells) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }

    const actionCell = document.createElement("td");
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.dataset.entryId = entry.id;
    deleteButton.setAttribute("aria-label", "Eintrag löschen");
    deleteButton.title = "Eintrag löschen";
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("focusable", "false");
    icon.setAttribute("viewBox", "0 0 24 24");
    const iconPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    iconPath.setAttribute(
      "d",
      "M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3",
    );
    icon.append(iconPath);
    deleteButton.append(icon);
    actionCell.append(deleteButton);
    row.append(actionCell);

    return row;
  });

  recordsBody.replaceChildren(...rows);
  recordsMessage.textContent = `${data.length} ${data.length === 1 ? "Eintrag" : "Einträge"}`;
}

async function deleteRecord(entryId, button) {
  if (!currentUser || !confirm("Möchtest du diesen Eintrag wirklich löschen?")) {
    return;
  }

  button.disabled = true;

  const { error } = await supabase
    .from("work_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", currentUser.id);

  if (error) {
    button.disabled = false;
    recordsMessage.textContent =
      "Der Eintrag konnte nicht gelöscht werden. Bitte versuche es erneut.";
    return;
  }

  await loadRecords();
}

refreshButton.addEventListener("click", loadRecords);

recordsBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-entry-id]");
  if (button) deleteRecord(button.dataset.entryId, button);
});

initializeAuth((user) => {
  currentUser = user;
  if (user) loadRecords();
  else recordsBody.replaceChildren();
});
