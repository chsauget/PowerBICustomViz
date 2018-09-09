module powerbi.extensibility.visual {
    /**
     * Interface for BarCharts viewmodel.
     *
     * @interface
     * @property {BarChartDataPoint[]} dataPoints - Set of data points the visual will render.
     * @property {number} dataMax                 - Maximum data value in the set of data points.
     */
    interface BarChartViewModel {
        dataPoints: BarChartDataPoint[];
        dataMax: number;
        dataMin: number;
    };

    /**
     * Interface for BarChart data points.
     *
     * @interface
     * @property {number} value    - Data value for point.
     * @property {string} category - Coresponding category of data value.
     */
    interface BarChartDataPoint {
        value: number;
        category: string;
        start: number;
        end: number;
        class: string;
    };
     /**
     * Function that converts queried data into a view model that will be used by the visual
     *
     * @function
     * @param {VisualUpdateOptions} options - Contains references to the size of the container
     *                                        and the dataView which contains all the data
     *                                        the visual had queried.
     * @param {IVisualHost} host            - Contains references to the host which contains services
     */
    function visualTransform(options: VisualUpdateOptions, host: IVisualHost): BarChartViewModel {
        let dataViews = options.dataViews;
        let viewModel: BarChartViewModel = {
            dataPoints: [],
            dataMax: 0,
            dataMin: 0
        };
         if (!dataViews
            || !dataViews[0]
            || !dataViews[0].categorical
            || !dataViews[0].categorical.categories
            || !dataViews[0].categorical.categories[0].source
            || !dataViews[0].categorical.values)
            return viewModel;
        let categorical = dataViews[0].categorical;
        let category = categorical.categories[0];
        let dataValue = categorical.values[0];
        let barChartDataPoints: BarChartDataPoint[] = [];
        let dataMax: number;
        // Pre calculate start and end of each bar
        let cumulative = 0;
         for (let i = 0, len = Math.max(category.values.length, dataValue.values.length); i < len; i++) {
            
            if(i==len - 1)
            {
                barChartDataPoints.push({
                    category: <string>category.values[i],
                    value: <number>dataValue.values[i],
                    start: 0,
                    end :(<number>dataValue.values[i]),
                    class:'total'
                });
            }
            else
            {
                barChartDataPoints.push({
                    category: <string>category.values[i],
                    value: <number>dataValue.values[i],
                    start: cumulative,
                    end :(<number>dataValue.values[i] + cumulative),
                    class:(<number>dataValue.values[i] >= 0 ) ? 'positive' : 'negative'
                });
            }
            cumulative += <number>dataValue.values[i];
        }
                    

        dataMax = <number>dataValue.maxLocal;
         return {
            dataPoints: barChartDataPoints,
            dataMax: dataMax,
            dataMin : 0
        };
    }


    export class BarChart implements IVisual {
        private svg: d3.Selection<SVGElement>;
        private host: IVisualHost;
        private barChartContainer: d3.Selection<SVGElement>;
        private barContainer: d3.Selection<SVGElement>;
        private bars: d3.Selection<SVGElement>;
        private xAxis: d3.Selection<SVGElement>;
        private yAxis: d3.Selection<SVGElement>;
        
        static Config = {
            xScalePadding: 0.1,
            solidOpacity: 1,
            transparentOpacity: 0.4,
            margins: {
                top: 10,
                right: 0,
                bottom: 25,
                left: 45,
            },
            xAxisFontMultiplier: 0.04,
        };

        /**
         * Creates instance of BarChart. This method is only called once.
         *
         * @constructor
         * @param {VisualConstructorOptions} options - Contains references to the element that will
         *                                             contain the visual and a reference to the host
         *                                             which contains services.
         */
        constructor(options: VisualConstructorOptions) {
            this.host = options.host;
            let svg = this.svg = d3.select(options.element)
                .append('svg')
                .classed('barChart', true);
            
        
            this.xAxis = this.svg
                .append('g')
                .classed('xAxis', true);
            this.yAxis = this.svg
                .append('g')
                .classed('yAxis', true);
            this.barContainer = svg.append('g')
            .classed('barContainer', true);
        }

        /**
         * Updates the state of the visual. Every sequential databinding and resize will call update.
         *
         * @function
         * @param {VisualUpdateOptions} options - Contains references to the size of the container
         *                                        and the dataView which contains all the data
         *                                        the visual had queried.
         */
        public update(options: VisualUpdateOptions) {

            let viewModel: BarChartViewModel = visualTransform(options, this.host);
            //Retrieve the visualisation size from PowerBI
            let width = options.viewport.width;
            let height = options.viewport.height;

            this.svg.attr({
                width: width,
                height: height
            });

            let margins = BarChart.Config.margins;
            height -= (margins.bottom + margins.top);
            width -= margins.left;

            this.xAxis.style({
                "font-size": d3.min([height, width]) * BarChart.Config.xAxisFontMultiplier
            });
            this.yAxis.style({
                "font-size": d3.min([height, width]) * BarChart.Config.xAxisFontMultiplier
            });

            let yScale = d3.scale.linear()
                .domain([viewModel.dataMin, viewModel.dataMax])
                .range([height, 0]);
            
            let xScale = d3.scale.ordinal()
                .domain(viewModel.dataPoints.map(d => d.category))
                .rangeRoundBands([0, width], BarChart.Config.xScalePadding);

            let xAxis = d3.svg.axis()
                .scale(xScale)
                .orient('bottom');

            this.xAxis.attr('transform', 'translate('+margins.left+', ' + (height + margins.top)  + ')')
                .call(xAxis);  

            let yAxis = d3.svg.axis()
                .scale(yScale)
                .orient('left');

            this.yAxis.attr('transform', 'translate(51, '+margins.top+')')
                .call(yAxis);               
            
                this.yAxis.attr('transform', 'translate(51, '+margins.top+')')
                .attr("class","grid")

                .call(yAxis.tickSize(-width));


            //console.log('Visual update' , options);
            //debugger;
            let bars = this.barContainer.selectAll('.bar').data(viewModel.dataPoints);
            bars.enter()
                .append('rect');
            bars.attr({
                width: xScale.rangeBand(),
                height: d => height - yScale(Math.abs( d.start - d.end)),
                y: d => yScale(Math.max(d.start, d.end) ),
                x: d => xScale(d.category),
                transform: 'translate('+margins.left+', '+margins.top+')',
                class : d => 'bar ' + d.class
            });

      
            let lbl = this.barContainer.selectAll('.lbl').data(viewModel.dataPoints);
            lbl.enter()
            .append("text");
            lbl.attr({
                x: d => xScale(d.category) + xScale.rangeBand() / 2,
                y: d => yScale(d.end),
                dy: d => ((d.class=='negative') ? '-' : '') + "1.4em",
                transform: 'translate('+margins.left+', '+margins.top+')',
                class: 'lbl',
                'text-anchor':"middle"
            })
            .text(d => d.value);



            lbl.exit()
            .remove();
            bars.exit()
                .remove();
        }

        /**
         * Destroy runs when the visual is removed. Any cleanup that the visual needs to
         * do should be done here.
         *
         * @function
         */
        public destroy(): void {
            //Perform any cleanup tasks here
        }
        
        
    }
}