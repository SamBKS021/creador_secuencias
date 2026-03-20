import { useAppContext } from '../app/store/AppContext.jsx'

export function useWorkspaceGuard() {
  const { state } = useAppContext()
  return {
    hasWorkspace: Boolean(state.workspaceRoot),
    workspaceRoot: state.workspaceRoot,
    loading: state.loading,
  }
}
