import { supabase } from "./supabase.js";
import { initializeAuth } from "./auth.js";

const form = document.querySelector("#work-form");
const result = document.querySelector("#work-result");
const employeeName = form.elements.employeeName;
const workDate = form.elements.workDate;
const calculateButton = document.querySelector("#calculate-work-time");
const saveButton = document.querySelector("#save-work-entry");
let currentUser = null;
let calculatedEntry = null;

initializeAuth((user) => {
  currentUser = user;

  if (user?.email && !employeeName.value.trim()) {
    const localPart = user.email.split("@")[0].split("+")[0];
    const nameSuggestion = localPart
      .split(/[._-]+/)
      .filter(Boolean)
      .map(
        (part) =>
          part.charAt(0).toLocaleUpperCase("de-CH") +
          part.slice(1).toLocaleLowerCase("de-CH"),
      )
      .join(" ");

    if (nameSuggestion) employeeName.value = nameSuggestion;
  }
});

function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function showResult(message, isError = false) {
  result.textContent = message;
  result.dataset.state = isError ? "error" : "success";
}

function calculateWorkTime() {
  calculatedEntry = null;
  saveButton.disabled = true;
  workDate.max = getToday();

  if (!form.reportValidity()) {
    showResult("Bitte fülle alle Felder aus und prüfe die Eingaben.", true);
    return;
  }

  if (workDate.value > getToday()) {
    showResult("Das Datum darf nicht in der Zukunft liegen.", true);
    return;
  }

  const startValue = form.elements.workStart.value;
  const endValue = form.elements.workEnd.value;
  const breakValue = Number(form.elements.breakMinutes.value);
  const [startHours, startMinutes] = startValue.split(":").map(Number);
  const [endHours, endMinutes] = endValue.split(":").map(Number);
  const startTotal = startHours * 60 + startMinutes;
  const endTotal = endHours * 60 + endMinutes;
  const grossMinutes = endTotal - startTotal;

  if (endTotal <= startTotal) {
    showResult("Das Arbeitsende muss nach dem Arbeitsbeginn liegen.", true);
    return;
  }

  if (!Number.isInteger(breakValue) || breakValue < 0) {
    showResult(
      "Die Pause muss als ganze, nicht negative Minutenzahl angegeben werden.",
      true,
    );
    return;
  }

  if (breakValue > grossMinutes) {
    showResult(
      "Die Pause darf nicht länger als die gesamte Arbeitszeit sein.",
      true,
    );
    return;
  }

  const effectiveMinutes = grossMinutes - breakValue;
  const hours = Math.floor(effectiveMinutes / 60);
  const minutes = effectiveMinutes % 60;
  const duration =
    minutes === 0
      ? `${hours} ${hours === 1 ? "Stunde" : "Stunden"}`
      : `${hours} Std. ${minutes} Min`;

  calculatedEntry = {
    employeeName: employeeName.value.trim(),
    workDate: workDate.value,
    workStart: startValue,
    workEnd: endValue,
    breakMinutes: breakValue,
    effectiveMinutes,
    duration,
  };
  saveButton.disabled = false;
  showResult(`Effektive Arbeitszeit: ${duration}.`);
}

async function saveWorkEntry() {
  if (!calculatedEntry) {
    showResult("Bitte berechne zuerst die Arbeitszeit.", true);
    return;
  }

  if (!currentUser) {
    showResult("Bitte melde dich an, um deine Arbeitszeit zu speichern.", true);
    return;
  }

  saveButton.disabled = true;
  calculateButton.disabled = true;
  showResult("Arbeitszeit wird gespeichert …");
  const duration = calculatedEntry.duration;

  const { error } = await supabase.from("work_entries").insert({
    user_id: currentUser.id,
    employee_name: calculatedEntry.employeeName,
    work_date: calculatedEntry.workDate,
    work_start: calculatedEntry.workStart,
    work_end: calculatedEntry.workEnd,
    break_minutes: calculatedEntry.breakMinutes,
    effective_minutes: calculatedEntry.effectiveMinutes,
  });

  if (error) {
    calculateButton.disabled = false;
    saveButton.disabled = !calculatedEntry;
    showResult(
      "Das Speichern ist fehlgeschlagen. Bitte prüfe die Datenbankeinrichtung.",
      true,
    );
    return;
  }

  calculatedEntry = null;
  calculateButton.disabled = false;
  showResult(`Effektive Arbeitszeit: ${duration}. Eintrag wurde gespeichert.`);
}

workDate.max = getToday();

calculateButton.addEventListener("click", () => {
  calculateWorkTime();
});

saveButton.addEventListener("click", saveWorkEntry);

form.addEventListener("input", () => {
  if (!calculatedEntry) return;

  calculatedEntry = null;
  saveButton.disabled = true;
  showResult("Eingaben geändert. Bitte erneut berechnen.");
});

form.addEventListener("change", () => {
  if (!calculatedEntry) return;

  calculatedEntry = null;
  saveButton.disabled = true;
  showResult("Eingaben geändert. Bitte erneut berechnen.");
});
