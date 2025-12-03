// En la sección de cards, agregar:
<Card className="bg-gray-50 shadow-md hover:shadow-lg transition-shadow">
  <CardHeader>
    <div className="flex items-center gap-3">
      <Users className="h-8 w-8 text-primary-blue" />
      <Car
dTitle className="text-primary-blue">Usuarios</CardTitle>
    </div>
    <CardDescription>Gestiona usuarios y sus roles.</CardDescription>
  </CardHeader>
  <CardContent className="flex flex-col space-y-2">
    <Button 
      variant="outline" 
      className="w-full justify-start" 
      onClick={() => navigate('/admin/users')}
    >
      Gestionar Usuarios
    </Button>
  </CardContent>
</Card>