import { supabase } from "./supabase.js";
import { initializeAuth } from "./auth.js";

const form = document.querySelector("#work-form");
const result = document.querySelector("#work-result");
const workDate = form.elements.workDate;
const submitButton = form.querySelector("button[type='submit']");
let currentUser = null;

initializeAuth((user) => {
  currentUser = user;
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

async function calculateWorkTime() {
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
      : `${hours} Std. ${minutes} Min.`;

  if (!currentUser) {
    showResult("Bitte melde dich an, um deine Arbeitszeit zu speichern.", true);
    return;
  }

  submitButton.disabled = true;
  showResult("Arbeitszeit wird gespeichert …");

  const { error } = await supabase.from("work_entries").insert({
    user_id: currentUser.id,
    employee_name: form.elements.employeeName.value.trim(),
    work_date: workDate.value,
    work_start: startValue,
    work_end: endValue,
    break_minutes: breakValue,
    effective_minutes: effectiveMinutes,
  });

  submitButton.disabled = false;

  if (error) {
    showResult(
      "Berechnung fertig, aber das Speichern ist fehlgeschlagen. Bitte prüfe die Datenbankeinrichtung.",
      true,
    );
    return;
  }

  showResult(`Effektive Arbeitszeit: ${duration}. Eintrag wurde gespeichert.`);
}

workDate.max = getToday();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  calculateWorkTime();
});
