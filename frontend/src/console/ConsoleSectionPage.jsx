import { Construction } from "lucide-react";
import { useLocation } from "react-router-dom";
import PageState from "../components/ui/PageState";
import { OperationalPage, PageIntro } from "../components/ui/OperationalPage";
import { consoleNavigation } from "./consoleManifest";
import ConsoleSystemPage from "./ConsoleSystemPage";

export default function ConsoleSectionPage() {
  const location = useLocation();
  const section = consoleNavigation.find((item) => item.path === location.pathname);

  if (section?.id === "system") {
    return <ConsoleSystemPage />;
  }

  return (
    <OperationalPage className="w-full min-w-0" data-testid="console-section-page">
      <PageIntro
        eyebrow="Admin Console"
        title={section?.label || "Cấu hình hệ thống"}
        description={section?.description || "Phân hệ cấu hình đang được chuẩn bị."}
      />
      <PageState
        icon={Construction}
        title="Chưa kết nối API cấu hình"
        message="Phần giao diện này chỉ được kích hoạt sau khi tenancy, quyền truy cập và Config Service vượt qua các kiểm thử cách ly. Hệ thống không hiển thị dữ liệu giả."
        tone="slate"
      />
    </OperationalPage>
  );
}
