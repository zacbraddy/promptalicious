import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Layout } from "./components/Layout";

function App() {
  return (
    <Layout>
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to promptalicious</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              A local development tool for debugging and iterating LLM prompts
              with full diagnostic visibility.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dark Theme Applied</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                <span className="font-semibold">Background:</span> Muddy blacks
              </p>
              <p>
                <span className="font-semibold">Foreground:</span> Soft greys
              </p>
              <p>
                <span className="font-semibold text-primary">Primary:</span>{" "}
                Subdued cyan
              </p>
              <p>
                <span className="font-semibold text-accent">Accent:</span>{" "}
                Subdued magenta
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

export default App;
