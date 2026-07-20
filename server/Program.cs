var builder = WebApplication.CreateBuilder(args);

// Listen on http://localhost:5080 for all local dev environments (HTTP only, no HTTPS).
builder.WebHost.UseUrls("http://localhost:5080");

// Add services to the container.
builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// CORS: allow the Angular dev server (ng serve) to call this API.
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Global error handling: unhandled exceptions are converted to RFC 7807 ProblemDetails responses.
builder.Services.AddProblemDetails();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseExceptionHandler();

app.UseCors("AllowFrontend");

app.UseAuthorization();

app.MapControllers();

app.Run();
