import { useParams, Navigate } from "react-router-dom";
import { getFamilyBySlug } from "@/lib/seoModels";
import { GalleryView } from "./Gallery";

const ModelLanding = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const family = getFamilyBySlug(slug);
  if (!family) return <Navigate to="/gallery" replace />;
  return <GalleryView family={family} />;
};

export default ModelLanding;
