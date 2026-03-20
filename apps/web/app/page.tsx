import FaceliftLanding from "./components/landing/FaceliftLanding";
import { getLandingGallery } from "@/lib/project-gallery";
import { getUSAAverageBidEstimate } from "@/lib/project-cost";
import { getCatalogItemsForLanding } from "@/lib/catalog-landing";

export default async function Page() {
  const [gallery, usaCost, catalogItems] = await Promise.all([
    getLandingGallery(6),
    getUSAAverageBidEstimate(),
    getCatalogItemsForLanding(),
  ]);
  return (
    <FaceliftLanding gallery={gallery} usaCost={usaCost} catalogItems={catalogItems} />
  );
}