import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInvoices, getInvoice, updateInvoice, deleteInvoice } from '../services/api.js';
import { toast } from '../store/toastStore.js';

export function useInvoiceList(params) {
  return useQuery({
    queryKey: ['invoices', params],
    queryFn: () => getInvoices(params),
    keepPreviousData: true,
  });
}

export function useInvoice(id) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id),
    enabled: !!id,
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateInvoice(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice updated');
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice deleted');
    },
    onError: (err) => toast.error(err.message),
  });
}
