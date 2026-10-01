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

    return row;
  });

  recordsBody.replaceChildren(...rows);
  recordsMessage.textContent = `${data.length} ${data.length === 1 ? "Eintrag" : "Einträge"}`;
}

refreshButton.addEventListener("click", loadRecords);

initializeAuth((user) => {
  currentUser = user;
  if (user) loadRecords();
  else recordsBody.replaceChildren();
});
