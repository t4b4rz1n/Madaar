import { motion } from "framer-motion";
import {
  Add,
  ArrowRight,
  CloseCircle,
  MessageText1,
  Messages,
  TickCircle,
} from "iconsax-reactjs";
import { Link } from "react-router-dom";
import { formatDate } from "../../../utils/formatDate";
import { useAuthStore } from "../../auth/store/authStore";
import { useTickets } from "../../tickets/hooks/useTickets";
import type { Ticket, TicketStatus } from "../../tickets/types";

const statusStyles: Record<TicketStatus, string> = {
  open: "bg-warning/10 text-warning border-warning/20",
  in_progress: "bg-info/10 text-info border-info/20",
  answered: "bg-primary/10 text-primary border-primary/20",
  closed: "bg-success/10 text-success border-success/20",
};

const formatStatus = (status: TicketStatus) =>
  status.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const UserDashboardPage = () => {
  const user = useAuthStore((state) => state.user);
  const ticketParams = new URLSearchParams({
    page: "1",
    page_size: "100",
    ordering: "-created_at",
  });
  const { data: ticketsResponse, isLoading, isError } = useTickets(ticketParams);

  const tickets: Ticket[] = ticketsResponse?.results ?? [];
  const userTickets = tickets.filter(
    (ticket) => !user?.username || ticket.user?.username === user.username
  );
  const recentTickets = userTickets.slice(0, 4);
  const displayName = user?.first_name || user?.username || "there";

  const stats = [
    {
      title: "My Tickets",
      value: userTickets.length,
      description: "Total support requests",
      icon: Messages,
      color: "text-primary",
      background: "bg-primary/10",
    },
    {
      title: "In Progress",
      value: userTickets.filter(
        (ticket) => ticket.status === "open" || ticket.status === "in_progress"
      ).length,
      description: "Currently being reviewed",
      icon: MessageText1,
      color: "text-info",
      background: "bg-info/10",
    },
    {
      title: "Answered",
      value: userTickets.filter((ticket) => ticket.status === "answered").length,
      description: "Responses ready to view",
      icon: TickCircle,
      color: "text-primary",
      background: "bg-primary/10",
    },
    {
      title: "Closed",
      value: userTickets.filter((ticket) => ticket.status === "closed").length,
      description: "Resolved requests",
      icon: CloseCircle,
      color: "text-success",
      background: "bg-success/10",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-primary/20 bg-base-100 p-6 shadow-sm sm:p-8"
      >
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              User Dashboard
            </p>
            <h1 className="text-2xl font-bold text-base-content sm:text-3xl">
              Welcome back, {displayName}
            </h1>
            <p className="mt-3 text-sm leading-6 text-base-content/65 sm:text-base">
              Track your support requests, review replies, or open a new ticket
              whenever you need help from the Tabarzin team.
            </p>
          </div>
          <Link
            to="/tickets"
            className="btn btn-primary h-12 rounded-xl px-6 font-semibold shadow-md shadow-primary/20"
          >
            <Add size={20} />
            Create a Ticket
          </Link>
        </div>
      </motion.section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;

          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * index }}
              className="rounded-2xl border border-base-content/10 bg-base-100 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-base-content/60">
                    {stat.title}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-base-content">
                    {isLoading ? (
                      <span className="loading loading-dots loading-sm" />
                    ) : (
                      stat.value
                    )}
                  </p>
                  <p className="mt-1 text-xs text-base-content/50">
                    {stat.description}
                  </p>
                </div>
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.background} ${stat.color}`}
                >
                  <Icon size={23} variant="Outline" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="overflow-hidden rounded-2xl border border-base-content/10 bg-base-100 shadow-sm"
      >
        <div className="flex flex-col gap-3 border-b border-base-content/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-base-content">
              Recent Tickets
            </h2>
            <p className="mt-1 text-sm text-base-content/60">
              Your latest conversations with the support team.
            </p>
          </div>
          <Link
            to="/tickets"
            className="btn btn-ghost btn-sm w-fit gap-2 text-primary"
          >
            View all tickets
            <ArrowRight size={16} />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center">
            <span className="loading loading-spinner loading-md text-primary" />
          </div>
        ) : isError ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <CloseCircle size={42} className="text-error/70" />
            <p className="mt-3 font-semibold text-base-content">
              Tickets could not be loaded
            </p>
            <p className="mt-1 text-sm text-base-content/60">
              Visit the tickets page to try again.
            </p>
          </div>
        ) : recentTickets.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Messages size={28} />
            </div>
            <p className="mt-4 font-semibold text-base-content">
              You have no support tickets yet
            </p>
            <p className="mt-1 max-w-md text-sm text-base-content/60">
              Create your first ticket and the Tabarzin support team will help
              you from there.
            </p>
            <Link to="/tickets" className="btn btn-primary btn-sm mt-5 rounded-lg">
              Create a Ticket
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-base-content/10">
            {recentTickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/tickets/${ticket.id}`}
                className="flex flex-col gap-3 p-5 transition-colors hover:bg-base-200/60 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-base-content">
                    {ticket.title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/50">
                    <span>#{ticket.id}</span>
                    <span>{formatDate(ticket.created_at)}</span>
                    <span className="capitalize">{ticket.priority} priority</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[ticket.status]}`}
                  >
                    {formatStatus(ticket.status)}
                  </span>
                  <ArrowRight size={18} className="text-base-content/35" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </motion.section>
    </motion.div>
  );
};

export default UserDashboardPage;
