import { supabase } from "./supabase.js";
import { initializeAuth } from "./auth.js";
import { initializeProfile } from "./profile.js";

const recordsBody = document.querySelector("#records-body");
const recordsMessage = document.querySelector("#records-message");
const refreshButton = document.querySelector("#refresh-records");
const exportButton = document.querySelector("#export-records");
const filterFrom = document.querySelector("#filter-from");
const filterTo = document.querySelector("#filter-to");
const filterName = document.querySelector("#filter-name");
const editDialog = document.querySelector("#edit-entry-dialog");
const editForm = document.querySelector("#edit-entry-form");
const editStatus = document.querySelector("#edit-entry-status");
const editSubmitButton = editForm.querySelector("button[type='submit']");
let currentUser = null;
let entries = [];

function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes === 0
    ? `${hours} Std.`
    : `${hours} Std. ${minutes} Min.`;
}

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("de-CH");
}

function getFilteredEntries() {
  const search = filterName.value.trim().toLocaleLowerCase("de-CH");

  return entries.filter((entry) => {
    const matchesFrom = !filterFrom.value || entry.work_date >= filterFrom.value;
    const matchesTo = !filterTo.value || entry.work_date <= filterTo.value;
    const matchesName = entry.employee_name
      .toLocaleLowerCase("de-CH")
      .includes(search);

    return matchesFrom && matchesTo && matchesName;
  });
}

function updateSummary(filteredEntries) {
  const totalMinutes = filteredEntries.reduce(
    (sum, entry) => sum + entry.effective_minutes,
    0,
  );
  const totalBreakMinutes = filteredEntries.reduce(
    (sum, entry) => sum + entry.break_minutes,
    0,
  );

  document.querySelector("#stat-days").textContent = filteredEntries.length;
  document.querySelector("#stat-hours").textContent =
    formatDuration(totalMinutes);
  document.querySelector("#stat-breaks").textContent =
    `${Math.floor(totalBreakMinutes / 60)} Std. ${totalBreakMinutes % 60} Min.`;
}

function makeIcon(pathData) {
  const svgNamespace = "http://www.w3.org/2000/svg";
  const icon = document.createElementNS(svgNamespace, "svg");
  const iconPath = document.createElementNS(svgNamespace, "path");
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("focusable", "false");
  icon.setAttribute("viewBox", "0 0 24 24");
  iconPath.setAttribute("d", pathData);
  icon.append(iconPath);
  return icon;
}

function renderRecords() {
  const filteredEntries = getFilteredEntries();
  updateSummary(filteredEntries);
  exportButton.disabled = filteredEntries.length === 0;

  if (filterFrom.value && filterTo.value && filterFrom.value > filterTo.value) {
    recordsBody.replaceChildren();
    recordsMessage.textContent = "Der Start des Zeitraums muss vor dem Ende liegen.";
    return;
  }

  if (filteredEntries.length === 0) {
    recordsBody.replaceChildren();
    recordsMessage.textContent = entries.length
      ? "Keine Einträge passen zu diesen Filtern."
      : "Du hast noch keine Arbeitszeiten erfasst.";
    return;
  }

  const rows = filteredEntries.map((entry) => {
    const row = document.createElement("tr");
    const values = [
      formatDate(entry.work_date),
      entry.employee_name,
      entry.work_start.slice(0, 5),
      entry.work_end.slice(0, 5),
      `${entry.break_minutes} Min.`,
      formatDuration(entry.effective_minutes),
    ];

    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }

    const actionCell = document.createElement("td");
    actionCell.className = "row-actions";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "icon-button edit-button";
    editButton.dataset.action = "edit";
    editButton.dataset.entryId = entry.id;
    editButton.setAttribute("aria-label", "Eintrag bearbeiten");
    editButton.title = "Eintrag bearbeiten";
    editButton.append(makeIcon("M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"));
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "icon-button delete-button";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.entryId = entry.id;
    deleteButton.setAttribute("aria-label", "Eintrag löschen");
    deleteButton.title = "Eintrag löschen";
    deleteButton.append(
      makeIcon("M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"),
    );
    actionCell.append(editButton, deleteButton);
    row.append(actionCell);
    return row;
  });

  recordsBody.replaceChildren(...rows);
  recordsMessage.textContent = `${filteredEntries.length} ${
    filteredEntries.length === 1 ? "Eintrag" : "Einträge"
  } angezeigt`;
}

async function loadRecords() {
  if (!currentUser) return;

  refreshButton.disabled = true;
  recordsMessage.textContent = "Lade Einträge …";
  recordsBody.replaceChildren();

  const { data, error } = await supabase
    .from("work_entries")
    .select(
      "id, employee_name, work_date, work_start, work_end, break_minutes, effective_minutes",
    )
    .eq("user_id", currentUser.id)
    .order("work_date", { ascending: false });

  refreshButton.disabled = false;

  if (error) {
    recordsMessage.textContent =
      "Die Einträge konnten nicht geladen werden. Bitte prüfe die Datenbankeinrichtung.";
    return;
  }

  entries = data;
  renderRecords();
}

function openEditDialog(entry) {
  editForm.elements.entryId.value = entry.id;
  editForm.elements.employeeName.value = entry.employee_name;
  editForm.elements.workDate.value = entry.work_date;
  editForm.elements.workStart.value = entry.work_start.slice(0, 5);
  editForm.elements.workEnd.value = entry.work_end.slice(0, 5);
  editForm.elements.breakMinutes.value = entry.break_minutes;
  editForm.elements.workDate.max = getToday();
  editStatus.textContent = "";
  editDialog.showModal();
}

async function updateRecord(event) {
  event.preventDefault();
  editStatus.textContent = "";

  if (!editForm.reportValidity()) return;

  const startValue = editForm.elements.workStart.value;
  const endValue = editForm.elements.workEnd.value;
  const [startHour, startMinute] = startValue.split(":").map(Number);
  const [endHour, endMinute] = endValue.split(":").map(Number);
  const grossMinutes =
    endHour * 60 + endMinute - (startHour * 60 + startMinute);
  const breakMinutes = Number(editForm.elements.breakMinutes.value);
  const workDate = editForm.elements.workDate.value;
  const today = getToday();

  if (workDate > today) {
    editStatus.textContent = "Das Datum darf nicht in der Zukunft liegen.";
    return;
  }

  if (grossMinutes <= 0) {
    editStatus.textContent =
      "Das Arbeitsende muss nach dem Arbeitsbeginn liegen.";
    return;
  }

  if (!Number.isInteger(breakMinutes) || breakMinutes < 0) {
    editStatus.textContent =
      "Die Pause muss eine ganze, nicht negative Minutenzahl sein.";
    return;
  }

  if (breakMinutes > grossMinutes) {
    editStatus.textContent =
      "Die Pause darf nicht länger als die gesamte Arbeitszeit sein.";
    return;
  }

  editSubmitButton.disabled = true;
  const entryId = editForm.elements.entryId.value;
  const { data, error } = await supabase
    .from("work_entries")
    .update({
      employee_name: editForm.elements.employeeName.value.trim(),
      work_date: workDate,
      work_start: startValue,
      work_end: endValue,
      break_minutes: breakMinutes,
      effective_minutes: grossMinutes - breakMinutes,
    })
    .eq("id", entryId)
    .eq("user_id", currentUser.id)
    .select("id")
    .maybeSingle();

  editSubmitButton.disabled = false;

  if (error || !data) {
    editStatus.textContent =
      error?.message ??
      "Der Eintrag wurde nicht gefunden oder kann nicht mehr bearbeitet werden.";
    return;
  }

  editDialog.close();
  await loadRecords();
}

async function deleteRecord(entryId, button) {
  if (!currentUser || !confirm("Möchtest du diesen Eintrag wirklich löschen?")) {
    return;
  }

  button.disabled = true;

  const { data, error } = await supabase
    .from("work_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", currentUser.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    button.disabled = false;
    recordsMessage.textContent = error?.message
      ? `Der Eintrag konnte nicht gelöscht werden: ${error.message}`
      : "Der Eintrag wurde inzwischen entfernt.";
    await loadRecords();
    return;
  }

  await loadRecords();
}

function exportRecords() {
  const filteredEntries = getFilteredEntries();
  const values = [
    ["Datum", "Mitarbeitende", "Beginn", "Ende", "Pause (Minuten)", "Arbeitszeit (Minuten)"],
    ...filteredEntries.map((entry) => [
      entry.work_date,
      entry.employee_name,
      entry.work_start.slice(0, 5),
      entry.work_end.slice(0, 5),
      entry.break_minutes,
      entry.effective_minutes,
    ]),
  ];
  const csv = values
    .map((row) =>
      row
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(";"),
    )
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "arbeitszeiten.csv";
  link.click();
  URL.revokeObjectURL(url);
}

refreshButton.addEventListener("click", loadRecords);
exportButton.addEventListener("click", exportRecords);
filterFrom.addEventListener("input", renderRecords);
filterTo.addEventListener("input", renderRecords);
filterName.addEventListener("input", renderRecords);
document.querySelector("#clear-filters").addEventListener("click", () => {
  filterFrom.value = "";
  filterTo.value = "";
  filterName.value = "";
  renderRecords();
});

recordsBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-entry-id]");
  if (!button) return;

  if (button.dataset.action === "edit") {
    const entry = entries.find((item) => item.id === button.dataset.entryId);
    if (entry) openEditDialog(entry);
  } else if (button.dataset.action === "delete") {
    deleteRecord(button.dataset.entryId, button);
  }
});

editForm.addEventListener("submit", updateRecord);
document.querySelector("#cancel-edit-entry").addEventListener("click", () => {
  editDialog.close();
});
editDialog.addEventListener("click", (event) => {
  if (event.target === editDialog) editDialog.close();
});

initializeAuth((user) => {
  currentUser = user;
  initializeProfile(user);
  if (user) loadRecords();
  else {
    entries = [];
    recordsBody.replaceChildren();
  }
});
