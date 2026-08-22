import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Login, Logout, TickCircle, Timer1 } from "iconsax-reactjs";
import { toast } from "sonner";
import { checkIn, checkOut, getTodayAttendance } from "../api/attendanceApi";
import { useAttendanceStore } from "../store/useAttendanceStore";
import type { Attendance } from '../types';

interface MutationError {
  detail?: string;
  message?: string;
  status?: boolean;
  [key: string]: unknown;
}

export const CheckInOut: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeOrganizationId } = useAttendanceStore();
  const { data: todayAttendance, isLoading } = useQuery({ queryKey: ["todayAttendance"], queryFn: getTodayAttendance });
  const checkInMutation = useMutation<Attendance, MutationError, string>({ mutationFn: (organizationId: string) => checkIn(organizationId), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["todayAttendance"] }); toast.success("Checked in"); }, onError: (error: MutationError) => toast.error(error?.detail || error?.message || "Could not complete action.") });
  const checkOutMutation = useMutation<Attendance, MutationError, void>({ mutationFn: checkOut, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["todayAttendance"] }); toast.success("Checked out"); }, onError: (error: MutationError) => toast.error(error?.detail || error?.message || "Could not complete action.") });
  if (isLoading) return <div className="h-32 animate-pulse rounded-[26px] bg-base-100" />;
  const checkedIn = Boolean(todayAttendance?.check_in);
  const checkedOut = Boolean(todayAttendance?.check_out);
  return (
    <section className="madaar-surface rounded-[26px] border border-base-content/10 bg-base-100 p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-success/10 text-success">
            <Timer1 size={23} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-success">Attendance</p>
            <h2 className="mt-1 text-lg font-semibold">{format(new Date(), "EEEE, MMMM d")}</h2>
            <p className="mt-1 text-xs text-base-content/50">Record when your working day starts and ends.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">In</p>
              <p className="mt-1 text-lg font-semibold">{todayAttendance?.check_in ? format(new Date(todayAttendance.check_in), "HH:mm") : "—"}</p>
            </div>
            <div className="h-9 w-px bg-base-content/10" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-base-content/40">Out</p>
              <p className="mt-1 text-lg font-semibold">{todayAttendance?.check_out ? format(new Date(todayAttendance.check_out), "HH:mm") : "—"}</p>
            </div>
          </div>
          {!checkedIn ? (
            <button
              type="button"
              onClick={() => activeOrganizationId ? checkInMutation.mutate(activeOrganizationId) : toast.warning("Please select or join an active organization first")}
              disabled={checkInMutation.isPending}
              className="btn btn-success text-white px-5 rounded-xl font-bold h-11 min-h-[44px] gap-2 motion-interactive"
            >
              <Login size={16} /> Check in
            </button>
          ) : !checkedOut ? (
            <button
              type="button"
              onClick={() => checkOutMutation.mutate()}
              disabled={checkOutMutation.isPending}
              className="btn btn-error text-white px-5 rounded-xl font-bold h-11 min-h-[44px] gap-2 motion-interactive"
            >
              <Logout size={16} /> Check out
            </button>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-xl bg-success/10 px-4 py-2.5 text-xs font-bold text-success">
              <TickCircle size={16} /> Day complete
            </span>
          )}
        </div>
      </div>
    </section>
  );
};
