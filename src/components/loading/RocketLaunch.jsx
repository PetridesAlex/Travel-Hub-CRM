import { Rocket } from 'lucide-react'

export default function RocketLaunch() {
  return (
    <div className="rocket-scene relative mx-auto mb-8 h-44 w-full max-w-[220px]">
      <div className="rocket-stars" aria-hidden="true" />
      <div className="rocket-pad" aria-hidden="true" />

      <div className="rocket-ship">
        <div className="rocket-exhaust">
          <span className="rocket-flame rocket-flame-1" />
          <span className="rocket-flame rocket-flame-2" />
          <span className="rocket-flame rocket-flame-3" />
        </div>
        <div className="rocket-body">
          <Rocket className="h-9 w-9 text-white" strokeWidth={1.75} />
        </div>
      </div>

      <div className="rocket-smoke rocket-smoke-1" aria-hidden="true" />
      <div className="rocket-smoke rocket-smoke-2" aria-hidden="true" />
      <div className="rocket-smoke rocket-smoke-3" aria-hidden="true" />
    </div>
  )
}
