import { Card, CardContent } from "@/components/ui/card";
export default function InvalidPortalPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <Card>
        <CardContent className="py-10 text-center">
          <h1 className="text-2xl font-semibold">Линкът не е активен</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Възможно е да е изтекъл или отнет. Поискай нов защитен линк от
            фирмата. Не е показана информация за обекта.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
