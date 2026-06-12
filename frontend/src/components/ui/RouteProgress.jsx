import { asyncCopy } from "../../design/tokens";
import { LoadingProgress } from "./LoadingStates";

export default function RouteProgress({ label = asyncCopy.route, className = "" }) {
  return <LoadingProgress label={label} className={className} />;
}
