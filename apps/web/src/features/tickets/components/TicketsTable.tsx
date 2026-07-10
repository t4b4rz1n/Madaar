import { motion } from "framer-motion";
import { CloseCircle, Messages, MessageText1, ArrowRight } from "iconsax-reactjs";
import { useNavigate } from "react-router-dom";
import type { Ticket } from "../types";
import { formatDate } from "../../../utils/formatDate";

interface TicketsTableProps {
  tickets: Ticket[];
  isLoading: boolean;
  isError: boolean;
}

const getTicketTypeName = (ticketType: Ticket["ticket_type"]) =>
  typeof ticketType === "string" ? ticketType : ticketType?.name || "";

export const TicketsTable = ({
  tickets,
  isLoading,
  isError,
}: TicketsTableProps) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="bg-base-100 rounded-2xl border border-base-content/10 overflow-hidden">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-base-content/10 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-linear-to-br from-error/5 to-error/10 rounded-2xl border border-error/20 p-12 text-center">
        <div className="text-error/40 mb-4">
          <CloseCircle className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-bold text-error mb-2">Loading Error</h3>
        <p className="text-error/70">There was a problem loading tickets</p>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="bg-linear-to-br from-base-200 to-base-300 rounded-2xl border border-base-content/10 p-12 text-center">
        <div className="text-base-content/40 mb-4">
          <Messages className="w-16 h-16 mx-auto text-base-content/40" />
        </div>
        <h3 className="text-lg font-bold text-base-content mb-2">No Tickets Found</h3>
        <p className="text-base-content/70">No tickets match your search criteria</p>
      </div>
    );
  }

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  return (
    <div className="bg-base-100 rounded-2xl border border-base-content/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-linear-to-r from-primary/10 to-primary/5 border-b border-base-content/10">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-bold text-base-content whitespace-nowrap">
                Subject
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-base-content whitespace-nowrap">
                Category
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-base-content whitespace-nowrap">
                Priority
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-base-content whitespace-nowrap">
                Status
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-base-content whitespace-nowrap">
                User
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-base-content whitespace-nowrap">
                Created At
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-base-content/5">
            {tickets.map((ticket, index) => (
              <motion.tr
                key={ticket.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => navigate(`/tickets/${ticket.id}`)}
                className="hover:bg-base-200 transition-all duration-200 group cursor-pointer"
              >
                {/* Title */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 shrink-0 flex items-center justify-center border border-base-200 group-hover:bg-primary/20 group-hover:border-primary/30 transition-all">
                      <MessageText1 size={18} className="text-primary" />
                    </div>
                    <span className="text-sm font-bold text-base-content group-hover:text-primary transition-colors">
                      {ticket.title}
                    </span>
                  </div>
                </td>

                {/* Ticket Type */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-xs text-base-content/70 bg-base-200/50 border border-base-content/10 px-2.5 py-1 rounded-lg">
                    {getTicketTypeName(ticket.ticket_type) || "—"}
                  </span>
                </td>

                {/* Priority */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${ticket.priority === "low"
                      ? "bg-success/10 text-success border-success/20"
                      : ticket.priority === "medium"
                        ? "bg-warning/10 text-warning border-warning/20"
                        : "bg-error/10 text-error border-error/20"
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${ticket.priority === "low" ? "bg-success" :
                      ticket.priority === "medium" ? "bg-warning" : "bg-error"
                      }`} />
                    {capitalize(ticket.priority)}
                  </span>
                </td>

                {/* Status */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${ticket.status === "open"
                      ? "bg-info/10 text-info border-info/20"
                      : ticket.status === "answered"
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-base-content/10 text-base-content/60 border-base-content/10"
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${ticket.status === "open" ? "bg-info animate-pulse" :
                      ticket.status === "answered" ? "bg-success" : "bg-base-content/30"
                      }`} />
                    {capitalize(ticket.status)}
                  </span>
                </td>

                {/* Creator */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-base-content/80 font-medium">
                    {ticket.user?.username || "N/A"}
                  </span>
                </td>

                {/* Created At */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-base-content/50">
                      {formatDate(ticket.created_at)}
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-primary shrink-0">
                      <ArrowRight size={16} />
                    </span>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
