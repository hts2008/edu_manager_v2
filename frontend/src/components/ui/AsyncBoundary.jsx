import { asyncCopy } from "../../design/tokens";
import LoadingScene from "./LoadingScene";
import PageState from "./PageState";

export default function AsyncBoundary({
  loading = false,
  error = null,
  children,
  loadingLabel = asyncCopy.route,
  loadingDetail,
  loadingVariant = "page",
  errorTitle = "Khong tai duoc du lieu",
  retryLabel = asyncCopy.retry,
  onRetry,
  skeleton,
}) {
  if (loading) {
    return skeleton || (
      <LoadingScene
        label={loadingLabel}
        detail={loadingDetail}
        variant={loadingVariant}
      />
    );
  }

  if (error) {
    return (
      <PageState
        title={errorTitle}
        message={error?.message || String(error)}
        tone="red"
        action={onRetry}
        actionLabel={retryLabel}
      />
    );
  }

  return children;
}
