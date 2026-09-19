import { useState } from "react";
import { useSendKudos } from "../api/gamificationApi";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "../../../core/config/axiosClient";
import { CloseCircle, Heart } from "iconsax-reactjs";

interface OrgUser { id: string; full_name?: string; first_name?: string; last_name?: string; username: string; }

interface Props { isOpen: boolean; onClose: () => void; }

const useOrgUsers = () =>
  useQuery({
    queryKey: ["org-users-for-kudos"],
    queryFn: async () => {
      const { data } = await axiosClient.get<{
        data?: { results?: OrgUser[]; data?: OrgUser[] } | OrgUser[];
        results?: OrgUser[];
      }>("/panel/users/?page_size=500");
      // Handle multiple response shapes
      const payload: any = data;
      const list: OrgUser[] =
        payload?.data?.results ??
        payload?.data ??
        payload?.results ??
        (Array.isArray(payload) ? payload : []);
      return list;
    },
    staleTime: 5 * 60 * 1000,
  });

export const SendKudosModal = ({ isOpen, onClose }: Props) => {
  const [receiverId, setReceiverId] = useState("");
  const [amount,     setAmount]     = useState<number>(10);
  const [message,    setMessage]    = useState("");

  const { mutate: sendKudos, isPending, error } = useSendKudos();
  const { data: users, isLoading: isUsersLoading } = useOrgUsers();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverId || amount <= 0 || !message) return;
    sendKudos(
      { receiver_id: receiverId, amount, message },
      { onSuccess: () => { setReceiverId(""); setMessage(""); setAmount(10); onClose(); } }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="modal-box relative bg-base-100/90 backdrop-blur-xl border border-base-content/10 shadow-2xl w-full max-w-md">
        <button onClick={onClose}
          className="btn btn-sm btn-circle btn-ghost absolute top-2 right-2 text-base-content/60">
          <CloseCircle />
        </button>

        <h3 className="font-bold text-lg flex items-center gap-2 mb-6">
          <Heart variant="Bold" className="text-secondary" /> Give Kudos
        </h3>

        {error && (
          <div className="alert alert-error mb-4 py-2">
            <span className="text-sm">
              {(error as any).response?.data?.detail ?? "Failed to send kudos. Check your budget."}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label"><span className="label-text">To Colleague</span></label>
            <select
              className="select select-bordered w-full bg-base-200/50"
              value={receiverId}
              onChange={(e) => setReceiverId(e.target.value)}
              required disabled={isUsersLoading}
            >
              <option value="" disabled>
                {isUsersLoading ? "Loading teammates..." : "Select a colleague..."}
              </option>
              {users?.map((u: OrgUser) => {
                const displayName =
                  u.full_name ||
                  [u.first_name, u.last_name].filter(Boolean).join(" ") ||
                  u.username;
                return (
                  <option key={u.id} value={u.id}>{displayName}</option>
                );
              })}
            </select>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Amount (points)</span>
              <span className="label-text-alt text-base-content/50">from your monthly budget</span>
            </label>
            <input type="number" className="input input-bordered w-full bg-base-200/50"
              min={1} max={500} value={amount}
              onChange={(e) => setAmount(Number(e.target.value))} required />
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text">Appreciation Message</span></label>
            <textarea
              className="textarea textarea-bordered h-24 bg-base-200/50"
              placeholder="Thanks for helping me with..."
              value={message} onChange={(e) => setMessage(e.target.value)} required
            />
          </div>

          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary"
              disabled={isPending || !receiverId || !message}>
              {isPending ? <span className="loading loading-spinner loading-sm" /> : "Send Kudos"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
