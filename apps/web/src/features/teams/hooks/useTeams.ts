import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { teamsApi } from "../api/teamsApi";
import type { SquadFormData, TeamFormData } from "../types";

export const useTeams = (params: URLSearchParams) => {
  const serializedParams = params.toString();

  return useQuery({
    queryKey: ["teams", serializedParams],
    queryFn: async () => {
      const response = await teamsApi.getTeams(
        Object.fromEntries(params.entries()),
      );

      return response.data;
    },
    placeholderData: keepPreviousData,
  });
};

export const useCreateTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TeamFormData) => teamsApi.createTeam(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["teams"],
      });

      toast.success("Team created successfully");
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error.message ||
        "Failed to create team";

      toast.error(errorMessage);
    },
  });
};

export const useUpdateTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TeamFormData> }) =>
      teamsApi.updateTeam(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["teams"],
      });

      toast.success("Team updated successfully");
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error.message ||
        "Failed to update team";

      toast.error(errorMessage);
    },
  });
};

export const useDeleteTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => teamsApi.deleteTeam(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["teams"],
      });

      toast.success("Team deleted successfully");
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error.message ||
        "Failed to delete team";

      toast.error(errorMessage);
    },
  });
};

export const useSquads = (teamId?: number) => {
  return useQuery({
    queryKey: ["squads", teamId],
    queryFn: async () => {
      const response = await teamsApi.getSquads(
        teamId !== undefined ? { team_id: teamId } : undefined,
      );

      return response.data;
    },
  });
};

export const useCreateSquad = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SquadFormData) => teamsApi.createSquad(data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["squads"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["teams"],
        }),
      ]);

      toast.success("Squad created successfully");
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error.message ||
        "Failed to create squad";

      toast.error(errorMessage);
    },
  });
};

export const useUpdateSquad = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SquadFormData> }) =>
      teamsApi.updateSquad(id, data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["squads"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["teams"],
        }),
      ]);

      toast.success("Squad updated successfully");
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error.message ||
        "Failed to update squad";

      toast.error(errorMessage);
    },
  });
};

export const useDeleteSquad = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => teamsApi.deleteSquad(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["squads"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["teams"],
        }),
      ]);

      toast.success("Squad deleted successfully");
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message ||
        error.message ||
        "Failed to delete squad";

      toast.error(errorMessage);
    },
  });
};
