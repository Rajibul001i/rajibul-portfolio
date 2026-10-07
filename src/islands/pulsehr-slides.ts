import type { CoverflowSlide } from "@/components/ui/coverflow-carousel";

// Screens captured from the PulseHR demo (seeded data, October 2026), cropped square.
const shot = (name: string) => `assets/pulsehr/${name}.webp`;

export const PULSEHR_SLIDES: CoverflowSlide[] = [
  {
    src: shot("hr-dashboard"),
    alt: "PulseHR HR dashboard: pending approvals, and employees ranked by attrition-risk score with a band for each",
    title: "Attrition risk",
    subtitle: "Who may be about to leave",
    meta: [
      { label: "Seen by", value: "HR" },
      { label: "Module", value: "Analytics" },
    ],
  },
  {
    src: shot("hr-why"),
    alt: "PulseHR risk score breakdown: a score of 69 out of 100 and the contributing factors behind it",
    title: "Why this score",
    subtitle: "Every factor behind a score",
    meta: [
      { label: "Seen by", value: "HR" },
      { label: "Module", value: "Analytics" },
    ],
  },
  {
    src: shot("hr-payslips"),
    alt: "PulseHR payroll by department: payslips, gross pay and deductions in taka",
    title: "Payroll",
    subtitle: "Bangladesh Labour Act, PDF payslips",
    meta: [
      { label: "Seen by", value: "HR" },
      { label: "Module", value: "Payroll" },
    ],
  },
  {
    src: shot("hr-people"),
    alt: "PulseHR people directory: employee codes, names, departments and joining dates",
    title: "People",
    subtitle: "Every record change is audited",
    meta: [
      { label: "Seen by", value: "HR" },
      { label: "Module", value: "People" },
    ],
  },
  {
    src: shot("mgr-shifts"),
    alt: "PulseHR shifts: early, general, late and night shifts, and a form to assign people to a shift",
    title: "Shifts",
    subtitle: "Who works when, night shifts too",
    meta: [
      { label: "Seen by", value: "Manager" },
      { label: "Module", value: "Attendance" },
    ],
  },
  {
    src: shot("mgr-leave"),
    alt: "PulseHR leave: earned, casual and sick leave balances and a leave request form",
    title: "Leave",
    subtitle: "Balances kept as a ledger",
    meta: [
      { label: "Seen by", value: "Manager" },
      { label: "Module", value: "Leave" },
    ],
  },
  {
    src: shot("emp-attendance"),
    alt: "PulseHR employee attendance: today's duty time, the next two weeks of shifts, and the month at a glance",
    title: "My attendance",
    subtitle: "Today's duty and a 14-day roster",
    meta: [
      { label: "Seen by", value: "Employee" },
      { label: "Module", value: "Attendance" },
    ],
  },
  {
    src: shot("recovery"),
    alt: "PulseHR password reset, step one of four: employee ID, then NID digits, phone code and new password",
    title: "Password recovery",
    subtitle: "Employee ID, NID digits, then an SMS code",
    meta: [
      { label: "Seen by", value: "Everyone" },
      { label: "Module", value: "Sign-in" },
    ],
  },
];
