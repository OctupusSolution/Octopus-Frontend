// widgets/business-wizard
// The provisioning steps shared by the 10-step signup flow and the shorter
// "create another business" wizard in Settings → My Businesses: pick a
// vertical, pick a type, answer the qualifying questions, review modules.
// This index.ts is the ONLY file other slices/layers may import from.
export { VerticalStep } from "./vertical-step";
export { TypeStep } from "./type-step";
export { QuestionsStep, type Answers } from "./questions-step";
export { ModulesStep } from "./modules-step";
