import { router } from "../server";
import { freelancerRouter } from "./freelancer";
import { projectRouter } from "./project";
import { contractRouter } from "./contract";
import { timesheetRouter } from "./timesheet";
import { invoiceRouter } from "./invoice";
import { complianceRouter } from "./compliance";
import { paymentRouter } from "./payment";
import { notificationRouter } from "./notification";
import { dashboardRouter } from "./dashboard";
import { membershipRouter } from "./membership";
import { companyRouter } from "./company";

export const appRouter = router({
  freelancer: freelancerRouter,
  project: projectRouter,
  contract: contractRouter,
  timesheet: timesheetRouter,
  invoice: invoiceRouter,
  compliance: complianceRouter,
  payment: paymentRouter,
  notification: notificationRouter,
  dashboard: dashboardRouter,
  membership: membershipRouter,
  company: companyRouter,
});

export type AppRouter = typeof appRouter;
