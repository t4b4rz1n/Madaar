import { motion } from "framer-motion";
import { Add, Flash, More, Refresh2, TaskSquare } from "iconsax-reactjs";
import { useForm } from "react-hook-form";
import { useAutomations, useCreateAutomation, CreateAutomationRulePayload } from "../hooks/useAutomations";

const EVENT_CHOICES = [
  { value: "project_created", label: "Project Created / Member Added" },
  { value: "project_member_removed", label: "Project Member Removed" },
  { value: "project_over_budget", label: "Project Over Budget" },
  { value: "milestone_approaching", label: "Milestone Deadline Approaching" },
  { value: "milestone_completed", label: "Milestone Completed" },
  { value: "task_assigned", label: "Task Assigned" },
  { value: "task_needs_review", label: "Task Needs Review" },
  { value: "task_completed", label: "Task Completed" },
  { value: "task_deadline_approaching", label: "Task Deadline Approaching" },
  { value: "user_mentioned", label: "User Mentioned in Comment" },
  { value: "task_commented", label: "New Task Comment" },
  { value: "standup_submitted", label: "Standup Submitted" },
  { value: "leave_requested", label: "Leave Requested" },
  { value: "leave_resolved", label: "Leave Resolved" },
  { value: "timer_started", label: "Timer Started" },
];

export const AutomationsPage = () => {
  const { data: rules = [], isLoading } = useAutomations();
  const { mutate: createRule, isPending } = useCreateAutomation();
  const { register, handleSubmit, reset } = useForm<CreateAutomationRulePayload>({
    defaultValues: {
      action_type: "telegram",
      message_template: "Task {{task.title}} was updated.",
      recipients: ["owner"],
      is_active: true,
    }
  });

  const openModal = () => {
    reset();
    const modal = document.getElementById("create_automation_modal") as HTMLDialogElement;
    if (modal) modal.showModal();
  };

  const closeModal = () => {
    const modal = document.getElementById("create_automation_modal") as HTMLDialogElement;
    if (modal) modal.close();
  };

  const onSubmit = (data: CreateAutomationRulePayload) => {
    const recipientsArray = Array.isArray(data.recipients) ? data.recipients : [data.recipients];
    
    createRule(
      { ...data, recipients: recipientsArray },
      {
        onSuccess: () => {
          closeModal();
        }
      }
    );
  };

  const getEventLabel = (value: string) => {
    return EVENT_CHOICES.find(e => e.value === value)?.label || value;
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
            اتوماسیون‌ها
          </h1>
          <p className="text-base-content/60 mt-1">
            کارهای روتین و اطلاع‌رسانی‌های پروژه‌ها را خودکار کنید.
          </p>
        </div>
        <button className="btn btn-primary rounded-xl px-6" onClick={openModal}>
          <Add size={20} />
          ساخت قانون جدید
        </button>
      </div>

      {/* Dynamic Rules List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {isLoading ? (
          <div className="col-span-full text-center py-10 opacity-50">در حال بارگذاری...</div>
        ) : rules.length === 0 ? (
          <div className="col-span-full text-center py-10 opacity-50 border-2 border-dashed border-base-content/10 rounded-2xl">
            هیچ قانونی یافت نشد. روی دکمه ساخت قانون جدید کلیک کنید.
          </div>
        ) : rules.map((rule) => (
          <div key={rule.id} className="bg-base-100 border border-base-content/10 rounded-2xl p-6 relative group hover:border-primary/50 transition-colors shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Flash variant="TwoTone" size={24} />
              </div>
              <input type="checkbox" className="toggle toggle-primary toggle-sm dir-ltr" defaultChecked={rule.is_active} />
            </div>
            
            <h3 className="font-bold text-lg mb-1 text-base-content" dir="ltr">{getEventLabel(rule.event_type)}</h3>
            
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-sm text-base-content/70">
                <div className="w-6 h-6 rounded-md bg-base-200 flex items-center justify-center">
                  <TaskSquare size={14} />
                </div>
                <span><strong className="text-base-content/90 font-semibold">اگر:</strong> {rule.event_type}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-base-content/70">
                <div className="w-6 h-6 rounded-md bg-base-200 flex items-center justify-center">
                  <Refresh2 size={14} />
                </div>
                <span><strong className="text-base-content/90 font-semibold">آنگاه:</strong> {rule.action_type}</span>
              </div>
            </div>

            <button className="absolute top-6 left-16 text-base-content/40 hover:text-base-content/80 transition-colors">
              <More size={20} />
            </button>
          </div>
        ))}
      </div>

      {/* Create Automation Modal */}
      <dialog id="create_automation_modal" className="modal modal-bottom sm:modal-middle">
        <div className="modal-box bg-base-100 border border-base-content/10 shadow-2xl rounded-2xl sm:max-w-xl p-0 overflow-visible">
          <div className="px-6 py-4 border-b border-base-content/10 flex justify-between items-center bg-base-200/30">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Flash variant="Bold" className="text-primary" />
              ساخت قانون اتوماسیون
            </h3>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="p-6 space-y-8">
              {/* Trigger Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                    ۱
                  </div>
                  <label className="text-sm font-bold text-base-content">اگر (شرط)</label>
                </div>
                <div className="pr-11">
                  <select 
                    {...register("event_type", { required: true })}
                    className="select select-bordered w-full bg-base-100 focus:outline-primary"
                    dir="ltr"
                  >
                    <option value="">-- Select Event --</option>
                    {EVENT_CHOICES.map(e => (
                      <option key={e.value} value={e.value}>{e.label} ({e.value})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="divider opacity-30 my-2"></div>

              {/* Action Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-secondary/20 text-secondary flex items-center justify-center font-bold">
                    ۲
                  </div>
                  <label className="text-sm font-bold text-base-content">آنگاه (عملیات)</label>
                </div>
                <div className="pr-11 space-y-4">
                  <select 
                    {...register("action_type")}
                    className="select select-bordered w-full bg-base-100 border-primary shadow-[0_0_8px_rgba(var(--p),0.15)] focus:outline-primary"
                  >
                    <option value="telegram">ارسال پیام به گروه تلگرام</option>
                    <option value="email">ارسال ایمیل</option>
                    <option value="both">ارسال به ایمیل و تلگرام</option>
                  </select>

                  <div className="space-y-4 bg-base-200/50 p-5 rounded-xl border border-base-content/10 mt-4">
                    <div>
                      <label className="label text-sm font-semibold py-1">Chat ID (گروه تلگرام)</label>
                      <input 
                        type="text"
                        {...register("telegram_group_id")}
                        placeholder="e.g. -100123456789"
                        className="input input-bordered input-sm w-full bg-base-100 font-mono"
                        dir="ltr"
                      />
                      <span className="text-xs text-base-content/50 mt-1 block">
                        اگر ربات در گروه است، آیدی عددی گروه را وارد کنید.
                      </span>
                    </div>

                    <div>
                      <label className="label text-sm font-semibold py-1">متن پیام (Template)</label>
                      <textarea 
                        {...register("message_template", { required: true })}
                        className="textarea textarea-bordered w-full text-sm font-mono h-24 bg-base-100"
                        dir="ltr"
                        placeholder="تسک {{task.title}} تکمیل شد."
                      ></textarea>
                      <span className="text-xs text-base-content/50 mt-1 block">از متغیرهایی مثل {'{{task.title}}'} می‌توانید استفاده کنید.</span>
                    </div>

                    <div>
                      <label className="label text-sm font-semibold py-1">دریافت‌کنندگان پیام</label>
                      <select 
                        {...register("recipients")}
                        multiple
                        className="select select-bordered select-sm w-full bg-base-100 h-24"
                      >
                        <option value="owner">صاحب پروژه (Owner)</option>
                        <option value="admins">ادمین‌های سازمان (Admins)</option>
                        <option value="team_leads">مدیران تیم (Team Leads)</option>
                        <option value="assignee">شخص انجام‌دهنده تسک (Assignee)</option>
                        <option value="reporter">گزارش‌دهنده (Reporter)</option>
                      </select>
                      <span className="text-xs text-base-content/50 mt-1 block">می‌توانید چند نفر را با نگه داشتن Ctrl انتخاب کنید.</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div className="modal-action bg-base-200/30 m-0 px-6 py-4 border-t border-base-content/10 rounded-b-2xl">
              <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={isPending}>انصراف</button>
              <button type="submit" className="btn btn-primary px-8" disabled={isPending}>
                {isPending ? <span className="loading loading-spinner"></span> : "ذخیره قانون"}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </motion.div>
  );
};
