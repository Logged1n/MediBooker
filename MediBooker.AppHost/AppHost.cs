var builder = DistributedApplication.CreateBuilder(args);

builder.AddProject<Projects.MediBooker_Server>("medibooker-server");

builder.Build().Run();
