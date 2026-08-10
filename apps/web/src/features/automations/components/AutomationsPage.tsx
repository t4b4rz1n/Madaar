import { motion } from "framer-motion";
import { Add, Flash, More, ArrowRight2, Refresh2, People } from "iconsax-reactjs";

export const AutomationsPage = () => {
  const openModal = () => {
    const modal = document.getElementById("create_automation_modal") as HTMLDialogElement;
    if (modal) modal.showModal();
  };

  const closeModal = () => {
    const modal = document.getElementById("create_automation_modal") as HTMLDialogElement;
    if (modal) modal.close();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-7xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-base-content flex items-center gap-3">
            <Flash variant="Bold" className="text-primary" size={32} />
            Workflow Automations
          </h1>
          <p className="text-base-content/60 mt-1">
            Automate routine tasks and notifications for your projects.
          </p>
        </div>
        <button className="btn btn-primary rounded-xl px-6" onClick={openModal}>
          <Add size={20} />
          Create Automation Rule
        </button>
      </div>

      {/* Mockup Rules List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {[
          {
            title: "Notify Group on Task Done",
            trigger: "Task moved to Done",
            action: "Send Telegram Message",
            active: true,
          },
          {
            title: "Welcome New Team Members",
            trigger: "User Added to Project",
            action: "Send Email Notification",
            active: true,
          },
          {
            title: "Overdue Task Alert",
            trigger: "Deadline passed",
            action: "Notify Assignee & Reporter",
            active: false,
          },
        ].map((rule, idx) => (
          <div key={idx} className="bg-base-100 border border-base-content/10 rounded-2xl p-6 relative group hover:border-primary/50 transition-colors shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Flash variant="TwoTone" size={24} />
              </div>
              <input type="checkbox" className="toggle toggle-primary toggle-sm" defaultChecked={rule.active} />
            </div>
            
            <h3 className="font-bold text-lg mb-1">{rule.title}</h3>
            
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-sm text-base-content/70">
                <div className="w-6 h-6 rounded-md bg-base-200 flex items-center justify-center">
                  <ArrowRight2 size={14} />
                </div>
                <span><strong className="text-base-content/90 font-semibold">WHEN:</strong> {rule.trigger}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-base-content/70">
                <div className="w-6 h-6 rounded-md bg-base-200 flex items-center justify-center">
                  <Refresh2 size={14} />
                </div>
                <span><strong className="text-base-content/90 font-semibold">THEN:</strong> {rule.action}</span>
              </div>
            </div>

            <button className="absolute top-6 right-16 text-base-content/40 hover:text-base-content/80 transition-colors">
              <More size={20} />
            </button>
          </div>
        ))}
      </div>

      {/* Create Automation Modal */}
      <dialog id="create_automation_modal" className="modal modal-bottom sm:modal-middle">
        <div className="modal-box bg-base-100 border border-base-content/10 shadow-2xl rounded-2xl sm:max-w-xl p-0 overflow-visible">
          <div className="px-6 py-4 border-b border-base-content/10 flex justify-between items-center bg-base-200">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Flash variant="Bold" className="text-primary" />
              New Automation Rule
            </h3>
          </div>
          
          <div className="p-6 space-y-8">
            {/* Trigger Section */}
            <div className="space-y-4 relative">
              <div className="absolute left-[15px] top-[40px] bottom-[-40px] w-0.5 bg-base-content/10 z-0"></div>
              
              <div className="relative z-10">
                <label className="text-xs font-bold text-base-content/50 uppercase tracking-wider mb-2 block">WHEN</label>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-1">
                    1
                  </div>
                  <div className="w-full space-y-3">
                    <select className="select select-bordered w-full bg-base-100 focus:bg-base-100 transition-colors relative z-20">
                      <option>Task moved to Done</option>
                      <option>Task Created</option>
                      <option>Project Deadline Approaching</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Section */}
            <div className="space-y-4 pt-4 relative z-10">
              <label className="text-xs font-bold text-base-content/50 uppercase tracking-wider mb-2 block">THEN</label>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-secondary/20 text-secondary flex items-center justify-center shrink-0 mt-1">
                  2
                </div>
                <div className="w-full space-y-4">
                  <select className="select select-bordered w-full bg-base-100 focus:bg-base-100 transition-colors border-primary/50 shadow-[0_0_10px_rgba(var(--p),0.2)] relative z-20">
                    <option>Send Telegram Message to Group</option>
                    <option>Send Email</option>
                    <option>Assign to User</option>
                  </select>

                  <div className="space-y-4 bg-base-200 p-5 rounded-xl border border-base-content/5 mt-4">
                    <div>
                      <label className="label text-xs py-1 font-bold">Telegram Group</label>
                      <select className="select select-bordered select-sm w-full bg-base-100">
                        <option>Management Channel</option>
                        <option>DevOps Alerts</option>
                      </select>
                    </div>

                    <div>
                      <label className="label text-xs py-1 font-bold">Message Template</label>
                      <textarea 
                        className="textarea textarea-bordered w-full text-sm font-mono h-24 bg-base-100"
                        defaultValue="Task {{task.id}}: {{task.title}} moved to Done. Status: Done. (Team notifications)"
                      ></textarea>
                    </div>

                    <div>
                      <label className="label text-xs py-1 font-bold">Additional Recipients</label>
                      <select className="select select-bordered select-sm w-full bg-base-100">
                        <option>Notify Specific Admins</option>
                        <option>Notify Reporter Only</option>
                        <option>Notify Project Owner</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="modal-action bg-base-200 m-0 px-6 py-4 border-t border-base-content/10">
            <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={closeModal}>Create Rule</button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

    </motion.div>
  );
};
