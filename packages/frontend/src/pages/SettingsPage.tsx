import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/Layout";
import { SettingsForm } from "@/components/SettingsForm";

export function SettingsPage() {
  const handleSubmit = (_data: {
    selectedModel: string;
    apiKey: string;
    providerEndpoint?: string;
  }) => {
    return Promise.resolve();
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure your LLM provider settings and API credentials
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>LLM Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <SettingsForm
              availableModels={["gpt-4o-mini"]}
              onSubmit={handleSubmit}
            />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
