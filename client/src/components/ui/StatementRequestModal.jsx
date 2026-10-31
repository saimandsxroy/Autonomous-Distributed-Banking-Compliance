import { useState } from "react";
import { Button } from "./Button";
import { Input } from "./Input";
import { useAuth } from "../../context/AuthContext";

export function StatementRequestModal({ onClose, onSubmit }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { user } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!user?.accountNumber) return;
    onSubmit(startDate, endDate);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border-4 border-zinc-800 p-8 rounded-lg w-full max-w-md">
        <h3 className="text-2xl font-black uppercase tracking-tighter mb-4">
          Request Statement
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 mb-6">
            <div>
              <label
                htmlFor="startDate"
                className="text-zinc-500 font-bold uppercase text-xs tracking-widest"
              >
                Start Date
              </label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-zinc-800 border-2 border-zinc-700 mt-1"
                required
              />
            </div>
            <div>
              <label
                htmlFor="endDate"
                className="text-zinc-500 font-bold uppercase text-xs tracking-widest"
              >
                End Date
              </label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-zinc-800 border-2 border-zinc-700 mt-1"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Request Statement</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

