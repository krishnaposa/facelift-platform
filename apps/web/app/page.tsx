import FaceliftLanding from "./components/landing/FaceliftLanding";
import { getLandingGallery } from "@/lib/project-gallery";

export default async function Page() {
  const gallery = await getLandingGallery(6);
  return <FaceliftLanding gallery={gallery} />;
}