import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import PageWrapper from "@/components/PageWrapper";
import ContentCard from "@/components/ContentCard";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <PageWrapper centerContent={true} showFooter={false} showMadeWithDyad={false}>
      <ContentCard className="text-center p-8">
        <h1 className="text-6xl font-extrabold text-emphasis-red mb-4 text-gradient">404</h1>
        <p className="text-2xl text-text-carbon mb-6">Oops! Página no encontrada</p>
        <Button 
          onClick={() => navigate('/')}
          className="bg-primary-blue hover:bg-blue-700 text-white font-bold hover-scale btn-touch"
        >
          Volver al Inicio
        </Button>
      </ContentCard>
    </PageWrapper>
  );
};

export default NotFound;