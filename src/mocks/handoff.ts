// notsobot.com's half of the sign-in handoff to notsogames.com (src/auth/handoff.ts, src/pages/auth/HandoffPage.tsx) over
// the dashboard mocks' fake fetch (registered by ./dashboard/index.ts): the code the page asks for. It carries
// sha256(state) (`mock.<hash>`), so notsogames.com-web's own mocks redeem only a state the code was made for. The redeem,
// guests and the games' web routes are notsogames.com-web's mocks


type Route = (method: string, pattern: string, handler: (match: RegExpMatchArray, request: {method: string, query: URLSearchParams, body: Record<string, unknown>, authorization: string | null}) => unknown) => void;
type MakeError = (status: number, code: number, message: string, metadata?: Record<string, unknown>) => Error;


export function registerHandoffMocks(route: Route, error: MakeError): void {
  route('POST', '/auth/handoff', (_match, { body }) => {
    if (body.target !== 'games' || typeof body.state_hash !== 'string' || !/^[0-9a-f]{64}$/.test(body.state_hash)) {
      throw error(400, 50035, 'Invalid Form Body');
    }
    return {code: `mock.${body.state_hash}`};
  });
}
