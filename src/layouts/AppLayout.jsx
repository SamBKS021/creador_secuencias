import { Outlet } from 'react-router-dom'
import { useAppContext } from '../app/store/AppContext.jsx'
import MobileNav from '../components/layout/MobileNav.jsx'
import SideNav from '../components/layout/SideNav.jsx'
import TopBar from '../components/layout/TopBar.jsx'

function AppLayout() {
  const { state, actions } = useAppContext()

  return (
    <div className="page-shell min-h-screen">
      <TopBar workspaceRoot={state.workspaceRoot} onChooseWorkspace={actions.chooseWorkspace} />
      <div className="mx-auto flex max-w-[1500px]">
        <SideNav />
        <main className="min-h-screen flex-1 px-4 pb-28 pt-24 lg:px-8 lg:pb-10">
          {state.notice ? (
            <div className="mb-5 rounded-2xl bg-[rgba(171,200,245,0.3)] px-4 py-3 text-sm text-[var(--primary)]">
              {state.notice}
            </div>
          ) : null}
          {state.error ? (
            <div className="mb-5 rounded-2xl bg-[rgba(186,26,26,0.08)] px-4 py-3 text-sm text-[var(--error)]">
              {state.error}
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  )
}

export default AppLayout
