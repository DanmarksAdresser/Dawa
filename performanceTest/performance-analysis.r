perf <- read.csv(file="perf.csv",head=TRUE,sep=" ")
perf <- read.csv(file="perf-40workers.csv",head=TRUE,sep=" ")
perf$begin = perf$start - perf$start[1]
perf$diff = perf$end - perf$start

plot(perf$begin, perf$diff, col=rgb(0,0,0,0.01))
hist(perf$diff, breaks=1000)

summary(perf$diff)
quantile(perf$diff, c(0, 0.5, 0.75, 0.90,0.95,0.99,0.995, 0.999, 0.9999, 0.99999))
plot.ecdf(perf$diff)
plot.ecdf(perf$diff, xlim=c(100,600))
plot.ecdf(perf$diff, ylim=c(0.9,1))

m <- max(perf$begin+perf$diff)
l <- length(perf[,1])
l/(m/1000)
