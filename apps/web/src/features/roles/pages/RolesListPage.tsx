// @apps/web/src/features/roles/pages/RolesListPage.tsx
import { useState } from "react";
import { CreateRoleModal } from "../components/CreateRoleModal";
import { useRoles } from "../hooks/useRoles";

interface Role {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  is_staff: boolean;
  permissions?: any[];
}

const RolesListPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ۲. اینجا به تایپ‌اسکریپت می‌گیم که دیتا دقیقاً چه شکلیه
  const { data, isLoading, isError } = useRoles();
  const roles: Role[] = data?.results ?? [];

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4 sm:p-6">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 sm:p-6">
        <div className="alert alert-error shadow-md border border-error/20">
          <span>Failed to load roles. Please try again.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      {/* Page header with modern and colorful create button */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-base-content sm:text-3xl tracking-tight">
            Roles Management
          </h1>
          <p className="mt-1 text-sm text-base-content/60 sm:text-base">
            Manage access levels and permissions for your team.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 w-full sm:w-auto font-medium"
          onClick={() => setIsModalOpen(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5 me-1 inline"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Create Role
        </button>

        <CreateRoleModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>

      {/* Modern panel and table */}
      <div className="card border border-base-300 bg-base-100 shadow-sm overflow-hidden">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr className="border-b border-base-300 bg-base-200/50 text-base-content/80">
                  <th className="py-4 pl-6 text-sm font-semibold">Role Name</th>
                  <th className="hidden md:table-cell py-4 text-sm font-semibold">
                    Description
                  </th>
                  <th className="py-4 text-sm font-semibold text-center">
                    Permissions
                  </th>
                  <th className="py-4 text-sm font-semibold text-center">
                    Status
                  </th>
                  <th className="py-4 pr-6 text-sm font-semibold text-end">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-base-200">
                {roles.length > 0 ? (
                  roles.map((role) => {
                    // اینجا داخل map تعریف می‌کنیم تا TypeScript خطا نده
                    const desc = role.description?.trim() ?? "";
                    const shouldTip = desc.length > 40;

                    return (
                      <tr
                        key={role.id}
                        className="hover:bg-base-200/30 transition-colors duration-150"
                      >
                        {/* Role name */}
                        <td className="py-4 pl-6">
                          <div className="font-semibold text-base-content text-[15px]">
                            {role.name}
                          </div>
                        </td>

                        {/* Description - hidden on mobile, now with proper Tooltip logic */}
                        <td className="hidden md:table-cell py-4 max-w-xs">
                          {shouldTip ? (
                            <div
                              className="tooltip tooltip-top tooltip-primary block w-full"
                              data-tip={desc}
                            >
                              <span className="block truncate text-sm text-base-content/70">
                                {desc}
                              </span>
                            </div>
                          ) : (
                            <span className="block truncate text-sm text-base-content/70">
                              {desc || "—"}
                            </span>
                          )}
                        </td>

                        {/* Permission count as modern compact badge */}
                        <td className="py-4 text-center">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            {role.permissions?.length ?? 0} Keys
                          </div>
                        </td>

                        {/* Active or inactive status */}
                        <td className="py-4 text-center">
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            {role.is_active ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-base-300 bg-base-300 px-2.5 py-1 text-xs font-semibold text-base-content/50">
                                Inactive
                              </span>
                            )}

                            {role.is_staff && (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-info/20 bg-info/10 px-2.5 py-1 text-xs font-semibold text-info">
                                Staff
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Small and stylish action buttons */}
                        <td className="py-4 pr-6 text-end">
                          <div className="inline-flex gap-1">
                            <button className="btn btn-sm btn-ghost text-base-content/70 hover:bg-base-200 hover:text-base-content transition-all">
                              Edit
                            </button>
                            <button className="btn btn-sm btn-ghost text-error/80 hover:bg-error/10 hover:text-error transition-all">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-10 h-10 text-base-content/30"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12h3.75M9 15h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-.621-.504-1.125-1.125-1.125H9.75M8.25 21h8.25c1.243 0 2.25-1.007 2.25-2.25V5.25C18.75 4.007 17.743 3 16.5 3H8.25C7.007 3 6 4.007 6 5.25v13.5C6 19.993 7.007 21 8.25 21z"
                          />
                        </svg>
                        <p className="text-base-content/50 font-medium">
                          No roles found.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolesListPage;
